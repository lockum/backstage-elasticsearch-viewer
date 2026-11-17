import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SearchClusterClient, formatBytes } from '../service/client';
import type { SearchClusterInstanceConfig } from '../service/config';

describe('SearchClusterClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const dummyEsConfig: SearchClusterInstanceConfig = {
    name: 'test-es',
    type: 'elasticsearch',
    url: 'https://test-es.internal:9200',
    auth: { username: 'elastic', password: 'password' },
    requestTimeoutMs: 1000,
  };

  const dummyOsConfig: SearchClusterInstanceConfig = {
    name: 'test-os',
    type: 'opensearch',
    url: 'https://test-os.internal:9200',
    requestTimeoutMs: 1000,
  };

  it('formatBytes correctly formats varying byte sizes', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1048576), '1 MB');
    assert.equal(formatBytes(1073741824 * 1.5), '1.5 GB');
    assert.equal(formatBytes(1099511627776 * 2.5), '2.5 TB');
  });

  it('correctly parses green health status and cluster metadata', async () => {
    globalThis.fetch = async (url: any) => {
      if (String(url).endsWith('/_cluster/health')) {
        return new Response(
          JSON.stringify({
            cluster_name: 'prod-es-cluster',
            status: 'green',
            number_of_nodes: 5,
            number_of_data_nodes: 3,
            active_primary_shards: 120,
            active_shards: 240,
            relocating_shards: 0,
            initializing_shards: 0,
            unassigned_shards: 0,
          }),
          { status: 200 },
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const client = new SearchClusterClient(dummyEsConfig);
    const health = await client.getHealth();

    assert.equal(health.status, 'green');
    assert.equal(health.clusterName, 'prod-es-cluster');
    assert.equal(health.numberOfNodes, 5);
    assert.equal(health.activePrimaryShards, 120);
    assert.equal(health.unassignedShards, 0);
  });

  it('correctly parses yellow and red status values', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          cluster_name: 'degraded-cluster',
          status: 'yellow',
          number_of_nodes: 2,
          unassigned_shards: 4,
        }),
        { status: 200 },
      );

    const client = new SearchClusterClient(dummyEsConfig);
    const health = await client.getHealth();
    assert.equal(health.status, 'yellow');
    assert.equal(health.unassignedShards, 4);
  });

  it('identifies OpenSearch distribution and version', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          version: {
            distribution: 'opensearch',
            number: '2.11.1',
            build_flavor: 'default',
            build_type: 'tar',
            lucene_version: '9.7.0',
          },
        }),
        { status: 200 },
      );

    const client = new SearchClusterClient(dummyOsConfig);
    const version = await client.getVersion();

    assert.equal(version.number, '2.11.1');
    assert.equal(version.majorVersion, 2);
    assert.equal(version.distribution, 'opensearch');
    assert.equal(version.luceneVersion, '9.7.0');
  });

  it('correctly supports and identifies Elasticsearch 9.x', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          name: 'es9-node-1',
          cluster_name: 'production-es9',
          version: {
            number: '9.0.1',
            build_flavor: 'default',
            build_type: 'tar',
            lucene_version: '10.1.0',
          },
          tagline: 'You Know, for Search',
        }),
        { status: 200 },
      );

    const client = new SearchClusterClient(dummyEsConfig);
    const version = await client.getVersion();

    assert.equal(version.number, '9.0.1');
    assert.equal(version.majorVersion, 9);
    assert.equal(version.luceneVersion, '10.1.0');
  });

  it('correctly supports and identifies OpenSearch 3.x latest', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          name: 'opensearch-3-node',
          cluster_name: 'production-os3',
          version: {
            distribution: 'opensearch',
            number: '3.0.0',
            build_type: 'tar',
            lucene_version: '10.0.0',
          },
          tagline: 'The OpenSearch Project: https://opensearch.org/',
        }),
        { status: 200 },
      );

    const client = new SearchClusterClient(dummyOsConfig);
    const version = await client.getVersion();

    assert.equal(version.number, '3.0.0');
    assert.equal(version.majorVersion, 3);
    assert.equal(version.distribution, 'opensearch');
    assert.equal(version.luceneVersion, '10.0.0');
  });

  it('calculates cluster storage and JVM stats from _cluster/stats', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          indices: {
            docs: { count: 12500000 },
            store: { size_in_bytes: 48000000000 },
          },
          nodes: {
            fs: {
              total_in_bytes: 200000000000,
              available_in_bytes: 140000000000,
            },
            jvm: {
              mem: {
                heap_used_in_bytes: 8000000000,
                heap_max_in_bytes: 16000000000,
              },
            },
          },
        }),
        { status: 200 },
      );

    const client = new SearchClusterClient(dummyEsConfig);
    const stats = await client.getStats();

    assert.equal(stats.totalBytes, 200000000000);
    assert.equal(stats.availableBytes, 140000000000);
    assert.equal(stats.usedBytes, 60000000000);
    assert.equal(stats.usedPercent, 30.0);
    assert.equal(stats.totalDocs, 12500000);
    assert.equal(stats.jvmHeapUsedPercent, 50.0);
  });

  it('returns top 7 most recent matching indices sorted descending by creation date', async () => {
    const rawIndices = [
      { index: 'logs-2026.11.10', health: 'green', status: 'open', 'docs.count': '100', 'store.size': '10mb', 'creation.date': '1762732800000' },
      { index: 'logs-2026.11.16', health: 'green', status: 'open', 'docs.count': '500', 'store.size': '50mb', 'creation.date': '1763251200000' },
      { index: 'logs-2026.11.12', health: 'green', status: 'open', 'docs.count': '200', 'store.size': '20mb', 'creation.date': '1762905600000' },
      { index: 'logs-2026.11.15', health: 'yellow', status: 'open', 'docs.count': '400', 'store.size': '40mb', 'creation.date': '1763164800000' },
      { index: 'logs-2026.11.11', health: 'green', status: 'open', 'docs.count': '150', 'store.size': '15mb', 'creation.date': '1762819200000' },
      { index: 'logs-2026.11.17', health: 'green', status: 'open', 'docs.count': '600', 'store.size': '60mb', 'creation.date': '1763337600000' },
      { index: 'logs-2026.11.13', health: 'green', status: 'open', 'docs.count': '250', 'store.size': '25mb', 'creation.date': '1762992000000' },
      { index: 'logs-2026.11.14', health: 'green', status: 'open', 'docs.count': '300', 'store.size': '30mb', 'creation.date': '1763078400000' },
      { index: 'logs-2026.11.09', health: 'red', status: 'close', 'docs.count': '50', 'store.size': '5mb', 'creation.date': '1762646400000' },
    ];

    globalThis.fetch = async () =>
      new Response(JSON.stringify(rawIndices), { status: 200 });

    const client = new SearchClusterClient(dummyEsConfig);
    const indices = await client.getMatchingIndices('logs-*');

    assert.equal(indices.length, 7);
    // Most recent should be logs-2026.11.17
    assert.equal(indices[0].name, 'logs-2026.11.17');
    assert.equal(indices[1].name, 'logs-2026.11.16');
    assert.equal(indices[2].name, 'logs-2026.11.15');
    assert.equal(indices[2].health, 'yellow');
    assert.equal(indices[6].name, 'logs-2026.11.11');
  });

  it('handles empty / not found index pattern gracefully by returning empty array', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            root_cause: [{ type: 'index_not_found_exception', reason: 'no such index' }],
          },
        }),
        { status: 404 },
      );

    const client = new SearchClusterClient(dummyEsConfig);
    const indices = await client.getMatchingIndices('missing-pattern*');
    assert.deepEqual(indices, []);
  });

  it('aggregates complete SearchClusterSummary with getSummary', async () => {
    globalThis.fetch = async (url: any) => {
      const path = String(url);
      if (path.endsWith('/_cluster/health')) {
        return new Response(
          JSON.stringify({ cluster_name: 'payment-es', status: 'green', number_of_nodes: 3 }),
          { status: 200 },
        );
      }
      if (path.endsWith('/')) {
        return new Response(
          JSON.stringify({ version: { number: '8.12.0' } }),
          { status: 200 },
        );
      }
      if (path.endsWith('/_cluster/stats')) {
        return new Response(
          JSON.stringify({
            nodes: { fs: { total_in_bytes: 1000, available_in_bytes: 600 } },
            indices: { docs: { count: 50 }, store: { size_in_bytes: 400 } },
          }),
          { status: 200 },
        );
      }
      if (path.includes('/_cat/indices')) {
        return new Response(
          JSON.stringify([
            { index: 'consumer-idx-1', health: 'green', status: 'open', 'docs.count': '50', 'store.size': '400b' },
          ]),
          { status: 200 },
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const client = new SearchClusterClient(dummyEsConfig);
    const summary = await client.getSummary('consumer-idx*');

    assert.equal(summary.instanceName, 'test-es');
    assert.equal(summary.engineType, 'elasticsearch');
    assert.equal(summary.clusterName, 'payment-es');
    assert.equal(summary.health.status, 'green');
    assert.equal(summary.version.number, '8.12.0');
    assert.equal(summary.indices.length, 1);
    assert.equal(summary.indices[0].name, 'consumer-idx-1');
  });
});

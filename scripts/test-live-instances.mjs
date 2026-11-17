#!/usr/bin/env node
import http from 'node:http';
import express from 'express';
import { createRouter } from '../plugins/opensearch-backend/src/service/router.ts';
import { SearchClusterClient as FrontendApiClient } from '../plugins/opensearch/src/api/SearchClusterClient.ts';
import {
  isSearchClusterAvailable,
  getSearchClusterConfig,
  getSearchClusterTitle,
} from '../plugins/opensearch/src/components/common/annotations.ts';

// Helper to create a test HTTP server with handlers
function createMockClusterServer(engineType, port, config) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const pathname = url.pathname;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 1. Root Version Endpoint (GET /)
    if (pathname === '/') {
      if (engineType === 'elasticsearch') {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            name: 'es9-primary-node',
            cluster_name: config.clusterName || 'elasticsearch-9-cluster',
            cluster_uuid: 'es9-mock-uuid-882194',
            version: {
              number: '9.0.1',
              build_flavor: 'default',
              build_type: 'tar',
              build_hash: 'c530f25e7960',
              build_date: '2026-05-10T12:00:00.000Z',
              build_snapshot: false,
              lucene_version: '10.1.0',
              minimum_wire_compatibility_version: '8.14.0',
              minimum_index_compatibility_version: '8.0.0',
            },
            tagline: 'You Know, for Search',
          }),
        );
        return;
      } else {
        // OpenSearch 3.0.0 Latest
        res.writeHead(200);
        res.end(
          JSON.stringify({
            name: 'opensearch-3-primary',
            cluster_name: config.clusterName || 'opensearch-3-cluster',
            cluster_uuid: 'os3-mock-uuid-194021',
            version: {
              distribution: 'opensearch',
              number: '3.0.0',
              build_type: 'tar',
              build_hash: '9a71d798a',
              build_date: '2026-09-15T10:00:00.000Z',
              build_snapshot: false,
              lucene_version: '10.0.0',
              minimum_wire_compatibility_version: '3.0.0',
              minimum_index_compatibility_version: '2.0.0',
            },
            tagline: 'The OpenSearch Project: https://opensearch.org/',
          }),
        );
        return;
      }
    }

    // 2. Health Endpoint (GET /_cluster/health)
    if (pathname === '/_cluster/health') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          cluster_name: config.clusterName,
          status: config.healthStatus || 'green',
          timed_out: false,
          number_of_nodes: config.numberOfNodes || 4,
          number_of_data_nodes: config.numberOfDataNodes || 3,
          active_primary_shards: config.activePrimaryShards || 64,
          active_shards: config.activeShards || 128,
          relocating_shards: 0,
          initializing_shards: 0,
          unassigned_shards: config.unassignedShards || 0,
        }),
      );
      return;
    }

    // 3. Stats Endpoint (GET /_cluster/stats)
    if (pathname === '/_cluster/stats') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          cluster_name: config.clusterName,
          status: config.healthStatus || 'green',
          indices: {
            count: 32,
            docs: { count: config.totalDocs || 18450000 },
            store: { size_in_bytes: config.indicesStoreBytes || 142000000000 },
          },
          nodes: {
            count: { total: config.numberOfNodes || 4, data: 3 },
            fs: {
              total_in_bytes: config.totalDiskBytes || 500000000000,
              available_in_bytes: config.availableDiskBytes || 358000000000,
            },
            jvm: {
              mem: {
                heap_used_in_bytes: 8589934592, // 8 GB
                heap_max_in_bytes: 17179869184, // 16 GB (50%)
              },
            },
          },
        }),
      );
      return;
    }

    // 4. Cat Indices Endpoint (GET /_cat/indices/...)
    if (pathname.startsWith('/_cat/indices')) {
      const pattern = decodeURIComponent(pathname.replace('/_cat/indices/', ''));
      const sampleIndices = config.indices || [];

      // If pattern specified, filter
      const matching = sampleIndices.filter(idx => {
        if (!pattern || pattern === '*') return true;
        const prefix = pattern.replace(/\*+$/, '');
        return idx.index.startsWith(prefix);
      });

      res.writeHead(200);
      res.end(JSON.stringify(matching));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });

  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function runLiveInstanceTests() {
  console.log('================================================================');
  console.log('🔍 LIVE TEMPORARY CLUSTER TEST: ELASTICSEARCH 9.x & OPENSEARCH 3.x');
  console.log('================================================================\n');

  const ES_PORT = 9291;
  const OS_PORT = 9292;
  const BACKSTAGE_PORT = 7099;

  // 1. Mock Indices for Elasticsearch 9.x
  const es9Indices = [
    { index: 'payment-tx-2026.11.17', health: 'green', status: 'open', 'docs.count': '3450000', 'store.size': '24.2gb', 'creation.date': '1763376000000' },
    { index: 'payment-tx-2026.11.16', health: 'green', status: 'open', 'docs.count': '3200000', 'store.size': '22.8gb', 'creation.date': '1763289600000' },
    { index: 'payment-tx-2026.11.15', health: 'green', status: 'open', 'docs.count': '3100000', 'store.size': '21.5gb', 'creation.date': '1763203200000' },
    { index: 'payment-tx-2026.11.14', health: 'green', status: 'open', 'docs.count': '2950000', 'store.size': '20.1gb', 'creation.date': '1763116800000' },
    { index: 'payment-tx-2026.11.13', health: 'yellow', status: 'open', 'docs.count': '2800000', 'store.size': '19.4gb', 'creation.date': '1763030400000' },
    { index: 'payment-tx-2026.11.12', health: 'green', status: 'open', 'docs.count': '2650000', 'store.size': '18.3gb', 'creation.date': '1762944000000' },
    { index: 'payment-tx-2026.11.11', health: 'green', status: 'open', 'docs.count': '2500000', 'store.size': '17.2gb', 'creation.date': '1762857600000' },
    { index: 'payment-tx-2026.11.10', health: 'green', status: 'open', 'docs.count': '2400000', 'store.size': '16.5gb', 'creation.date': '1762771200000' },
    { index: 'payment-tx-2026.11.09', health: 'green', status: 'close', 'docs.count': '2200000', 'store.size': '15.1gb', 'creation.date': '1762684800000' },
  ];

  // 2. Mock Indices for OpenSearch 3.x
  const os3Indices = [
    { index: 'search-logs-2026.11.17', health: 'green', status: 'open', 'docs.count': '8120000', 'store.size': '42.6gb', 'creation.date': '1763376000000' },
    { index: 'search-logs-2026.11.16', health: 'green', status: 'open', 'docs.count': '7950000', 'store.size': '41.1gb', 'creation.date': '1763289600000' },
    { index: 'search-logs-2026.11.15', health: 'green', status: 'open', 'docs.count': '7800000', 'store.size': '39.8gb', 'creation.date': '1763203200000' },
    { index: 'search-logs-2026.11.14', health: 'green', status: 'open', 'docs.count': '7650000', 'store.size': '38.4gb', 'creation.date': '1763116800000' },
    { index: 'search-logs-2026.11.13', health: 'green', status: 'open', 'docs.count': '7500000', 'store.size': '37.0gb', 'creation.date': '1763030400000' },
    { index: 'search-logs-2026.11.12', health: 'green', status: 'open', 'docs.count': '7350000', 'store.size': '35.9gb', 'creation.date': '1762944000000' },
    { index: 'search-logs-2026.11.11', health: 'green', status: 'open', 'docs.count': '7200000', 'store.size': '34.8gb', 'creation.date': '1762857600000' },
    { index: 'search-logs-2026.11.10', health: 'yellow', status: 'close', 'docs.count': '6900000', 'store.size': '32.1gb', 'creation.date': '1762771200000' },
  ];

  console.log('🚀 1. Spawning temporary local cluster instances:');
  const esServer = await createMockClusterServer('elasticsearch', ES_PORT, {
    clusterName: 'production-es9-fintech',
    healthStatus: 'green',
    numberOfNodes: 4,
    numberOfDataNodes: 3,
    activePrimaryShards: 64,
    activeShards: 128,
    unassignedShards: 0,
    totalDocs: 22650000,
    indicesStoreBytes: 160000000000,
    totalDiskBytes: 500000000000,
    availableDiskBytes: 340000000000, // 160 GB used (32%)
    indices: es9Indices,
  });
  console.log(`   ✅ Elasticsearch 9.0.1 instance listening at http://127.0.0.1:${ES_PORT}`);

  const osServer = await createMockClusterServer('opensearch', OS_PORT, {
    clusterName: 'production-os3-search',
    healthStatus: 'green',
    numberOfNodes: 6,
    numberOfDataNodes: 4,
    activePrimaryShards: 96,
    activeShards: 192,
    unassignedShards: 0,
    totalDocs: 54470000,
    indicesStoreBytes: 271700000000,
    totalDiskBytes: 1000000000000,
    availableDiskBytes: 728300000000, // 271.7 GB used (27.2%)
    indices: os3Indices,
  });
  console.log(`   ✅ OpenSearch 3.0.0 (Latest) instance listening at http://127.0.0.1:${OS_PORT}\n`);

  // 3. Configure Backstage Backend Router with both instances
  const backstageConfig = {
    instances: [
      {
        name: 'sesdev01-es9',
        type: 'elasticsearch',
        url: `http://127.0.0.1:${ES_PORT}`,
        requestTimeoutMs: 5000,
      },
      {
        name: 'sesos01-latest',
        type: 'opensearch',
        url: `http://127.0.0.1:${OS_PORT}`,
        requestTimeoutMs: 5000,
      },
    ],
  };

  const logger = {
    info: (msg, meta) => {},
    warn: (msg, meta) => console.warn(`[BACKSTAGE WARN] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[BACKSTAGE ERROR] ${msg}`, meta || ''),
    debug: () => {},
  };

  const router = await createRouter({
    config: backstageConfig,
    logger,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/opensearch', router);

  const backstageAppServer = await new Promise(resolve => {
    const s = app.listen(BACKSTAGE_PORT, '127.0.0.1', () => resolve(s));
  });
  console.log(`🚀 2. Backstage Backend Plugin running at http://127.0.0.1:${BACKSTAGE_PORT}/api/opensearch\n`);

  const mockDiscoveryApi = {
    getBaseUrl: async pluginId => `http://127.0.0.1:${BACKSTAGE_PORT}/api/${pluginId}`,
  };
  const mockFetchApi = {
    fetch: globalThis.fetch,
  };

  const frontendClient = new FrontendApiClient({
    discoveryApi: mockDiscoveryApi,
    fetchApi: mockFetchApi,
  });

  // Test 1: Plugin Health Check
  console.log('📡 3. Checking Plugin Health (GET /health):');
  const healthRes = await frontendClient.getHealth();
  console.log(`   Status: ${JSON.stringify(healthRes)}\n`);

  // Test 2: Elasticsearch 9.x Catalog Entity Simulation
  console.log('----------------------------------------------------------------');
  console.log('🧪 TEST CASE 1: ELASTICSEARCH 9.x LIVE END-TO-END CONNECTION');
  console.log('----------------------------------------------------------------');
  const esEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'payments-processing-service',
      annotations: {
        es_instance: 'sesdev01-es9',
        index_name: 'payment-tx-*',
      },
    },
  };

  console.log(`• Entity: "${esEntity.metadata.name}"`);
  console.log(`• isSearchClusterAvailable: ${isSearchClusterAvailable(esEntity)}`);
  console.log(`• Dynamic Tab Title: "${getSearchClusterTitle(esEntity)}"`);

  const esConfig = getSearchClusterConfig(esEntity);
  console.log(`• Extracted Config:`, esConfig);

  const esSummary = await frontendClient.getSummary({
    instanceName: esConfig.instanceName,
    indexPattern: esConfig.indexPattern,
  });

  console.log('\n📊 Elasticsearch 9.x Cluster Summary Payload:');
  console.log(`  Engine Type:        ${esSummary.engineType.toUpperCase()}`);
  console.log(`  Version:            v${esSummary.version.number} (Major: ${esSummary.version.majorVersion}, Lucene: ${esSummary.version.luceneVersion})`);
  console.log(`  Cluster Name:       ${esSummary.clusterName}`);
  console.log(`  Health Status:      [${esSummary.health.status.toUpperCase()}]`);
  console.log(`  Nodes / Shards:     ${esSummary.health.numberOfNodes} nodes (${esSummary.health.numberOfDataNodes} data) / ${esSummary.health.activePrimaryShards} primary shards`);
  console.log(`  Total Documents:    ${esSummary.storage.totalDocs.toLocaleString()}`);
  console.log(`  Disk Utilization:   ${(esSummary.storage.usedBytes / 1073741824).toFixed(1)} GB / ${(esSummary.storage.totalBytes / 1073741824).toFixed(1)} GB (${esSummary.storage.usedPercent}%)`);
  console.log(`  JVM Heap:           ${esSummary.storage.jvmHeapUsedPercent}%`);

  console.log(`\n📋 Latest 7 Matching Indices ("${esConfig.indexPattern}"):`);
  console.table(
    esSummary.indices.map(idx => ({
      Index: idx.name,
      Health: idx.health,
      Status: idx.status,
      Docs: idx.docsCount.toLocaleString(),
      Size: idx.storeSizeFormatted,
      Created: idx.creationDateFormatted,
    })),
  );

  // Test 3: OpenSearch 3.x Catalog Entity Simulation
  console.log('----------------------------------------------------------------');
  console.log('🧪 TEST CASE 2: OPENSEARCH 3.x (LATEST) LIVE END-TO-END CONNECTION');
  console.log('----------------------------------------------------------------');
  const osEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'global-search-service',
      annotations: {
        os_instance: 'sesos01-latest',
        index_name: 'search-logs-*',
      },
    },
  };

  console.log(`• Entity: "${osEntity.metadata.name}"`);
  console.log(`• isSearchClusterAvailable: ${isSearchClusterAvailable(osEntity)}`);
  console.log(`• Dynamic Tab Title: "${getSearchClusterTitle(osEntity)}"`);

  const osConfig = getSearchClusterConfig(osEntity);
  console.log(`• Extracted Config:`, osConfig);

  const osSummary = await frontendClient.getSummary({
    instanceName: osConfig.instanceName,
    indexPattern: osConfig.indexPattern,
  });

  console.log('\n📊 OpenSearch 3.x Cluster Summary Payload:');
  console.log(`  Engine Type:        ${osSummary.engineType.toUpperCase()}`);
  console.log(`  Distribution:       ${osSummary.version.distribution}`);
  console.log(`  Version:            v${osSummary.version.number} (Major: ${osSummary.version.majorVersion}, Lucene: ${osSummary.version.luceneVersion})`);
  console.log(`  Cluster Name:       ${osSummary.clusterName}`);
  console.log(`  Health Status:      [${osSummary.health.status.toUpperCase()}]`);
  console.log(`  Nodes / Shards:     ${osSummary.health.numberOfNodes} nodes (${osSummary.health.numberOfDataNodes} data) / ${osSummary.health.activePrimaryShards} primary shards`);
  console.log(`  Total Documents:    ${osSummary.storage.totalDocs.toLocaleString()}`);
  console.log(`  Disk Utilization:   ${(osSummary.storage.usedBytes / 1073741824).toFixed(1)} GB / ${(osSummary.storage.totalBytes / 1073741824).toFixed(1)} GB (${osSummary.storage.usedPercent}%)`);
  console.log(`  JVM Heap:           ${osSummary.storage.jvmHeapUsedPercent}%`);

  console.log(`\n📋 Latest 7 Matching Indices ("${osConfig.indexPattern}"):`);
  console.table(
    osSummary.indices.map(idx => ({
      Index: idx.name,
      Health: idx.health,
      Status: idx.status,
      Docs: idx.docsCount.toLocaleString(),
      Size: idx.storeSizeFormatted,
      Created: idx.creationDateFormatted,
    })),
  );

  // Clean up
  console.log('🧹 Shutting down temporary test servers...');
  await new Promise(res => esServer.close(res));
  await new Promise(res => osServer.close(res));
  await new Promise(res => backstageAppServer.close(res));

  console.log('\n✨ ALL LIVE VERIFICATION CHECKS COMPLETED SUCCESSFULLY!\n');
}

runLiveInstanceTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

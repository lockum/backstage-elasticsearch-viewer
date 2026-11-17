#!/usr/bin/env node
import http from 'node:http';

/**
 * Ephemeral / Local Mock Server for Elasticsearch 9.x and OpenSearch 3.x
 *
 * Runs persistent HTTP servers emulating:
 * - Port 9200: Elasticsearch 9.0.1 (cluster: es-payment-prod-cluster, instance: sesdev01)
 * - Port 9201: OpenSearch 3.0.0 (cluster: opensearch-catalog-prod, instance: sesos01)
 */

const ES_PORT = parseInt(process.env.ES_PORT || '9200', 10);
const OS_PORT = parseInt(process.env.OS_PORT || '9201', 10);

const es9ClusterData = {
  clusterName: 'es-payment-prod-cluster',
  clusterUuid: 'es9-mock-uuid-882194',
  numberOfNodes: 3,
  numberOfDataNodes: 3,
  healthStatus: 'green',
  activePrimaryShards: 32,
  activeShards: 64,
  indices: [
    {
      index: 'payment-transactions-2026.11.17',
      health: 'green',
      status: 'open',
      'docs.count': '4120500',
      'store.size': '18.2gb',
      'creation.date': '1763376000000',
    },
    {
      index: 'payment-transactions-2026.11.16',
      health: 'green',
      status: 'open',
      'docs.count': '3980100',
      'store.size': '17.5gb',
      'creation.date': '1763289600000',
    },
    {
      index: 'payment-audit-logs-2026.11',
      health: 'green',
      status: 'open',
      'docs.count': '1250000',
      'store.size': '5.8gb',
      'creation.date': '1763203200000',
    },
    {
      index: 'payment-settlements-2026.11',
      health: 'green',
      status: 'open',
      'docs.count': '840200',
      'store.size': '3.4gb',
      'creation.date': '1763116800000',
    },
    {
      index: 'system-metrics-2026.11',
      health: 'green',
      status: 'open',
      'docs.count': '510000',
      'store.size': '1.2gb',
      'creation.date': '1763030400000',
    },
  ],
};

const os3ClusterData = {
  clusterName: 'opensearch-catalog-prod',
  clusterUuid: 'os3-mock-uuid-194021',
  numberOfNodes: 4,
  numberOfDataNodes: 3,
  healthStatus: 'green',
  activePrimaryShards: 48,
  activeShards: 96,
  indices: [
    {
      index: 'search-catalog-products-v3',
      health: 'green',
      status: 'open',
      'docs.count': '12450000',
      'store.size': '48.6gb',
      'creation.date': '1763376000000',
    },
    {
      index: 'search-catalog-categories-v2',
      health: 'green',
      status: 'open',
      'docs.count': '185000',
      'store.size': '850mb',
      'creation.date': '1763289600000',
    },
    {
      index: 'search-suggestions-autocomplete',
      health: 'green',
      status: 'open',
      'docs.count': '2100000',
      'store.size': '6.2gb',
      'creation.date': '1763203200000',
    },
    {
      index: 'search-query-analytics-2026.11.17',
      health: 'green',
      status: 'open',
      'docs.count': '8920000',
      'store.size': '31.4gb',
      'creation.date': '1763116800000',
    },
    {
      index: 'search-user-clicks-2026.11',
      health: 'green',
      status: 'open',
      'docs.count': '9144800',
      'store.size': '35.8gb',
      'creation.date': '1763030400000',
    },
    {
      index: 'internal-catalog-meta',
      health: 'green',
      status: 'open',
      'docs.count': '42000',
      'store.size': '120mb',
      'creation.date': '1762944000000',
    },
  ],
};

function createClusterServer(engineType, port, config) {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const pathname = url.pathname;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 1. Root Version Endpoint (GET /)
    if (pathname === '/' || pathname === '') {
      if (engineType === 'elasticsearch') {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            name: 'es9-node-01',
            cluster_name: config.clusterName,
            cluster_uuid: config.clusterUuid,
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
        res.writeHead(200);
        res.end(
          JSON.stringify({
            name: 'os3-node-01',
            cluster_name: config.clusterName,
            cluster_uuid: config.clusterUuid,
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
          status: config.healthStatus,
          timed_out: false,
          number_of_nodes: config.numberOfNodes,
          number_of_data_nodes: config.numberOfDataNodes,
          active_primary_shards: config.activePrimaryShards,
          active_shards: config.activeShards,
          relocating_shards: 0,
          initializing_shards: 0,
          unassigned_shards: 0,
        }),
      );
      return;
    }

    // 3. Stats Endpoint (GET /_cluster/stats)
    if (pathname === '/_cluster/stats') {
      const totalDocs = config.indices.reduce(
        (sum, i) => sum + parseInt(i['docs.count'], 10),
        0,
      );
      res.writeHead(200);
      res.end(
        JSON.stringify({
          cluster_name: config.clusterName,
          status: config.healthStatus,
          indices: {
            count: config.indices.length,
            docs: { count: totalDocs },
            store: { size_in_bytes: 142000000000 },
          },
          nodes: {
            count: { total: config.numberOfNodes, data: config.numberOfDataNodes },
            fs: {
              total_in_bytes: 500000000000,
              available_in_bytes: 358000000000,
            },
            jvm: {
              mem: {
                heap_used_in_bytes: 8589934592,
                heap_max_in_bytes: 17179869184,
              },
            },
          },
        }),
      );
      return;
    }

    // 4. Cat Indices Endpoint (GET /_cat/indices/...)
    if (pathname.startsWith('/_cat/indices')) {
      const pattern = decodeURIComponent(
        pathname.replace('/_cat/indices/', '').replace('/_cat/indices', ''),
      );
      const sampleIndices = config.indices;

      const matching = sampleIndices.filter(idx => {
        if (!pattern || pattern === '*' || pattern === '') return true;
        const prefix = pattern.replace(/\*+$/, '');
        return idx.index.startsWith(prefix);
      });

      res.writeHead(200);
      res.end(JSON.stringify(matching));
      return;
    }

    // 5. Cat Nodes Endpoint (GET /_cat/nodes)
    if (pathname.startsWith('/_cat/nodes')) {
      res.writeHead(200);
      res.end(
        JSON.stringify([
          {
            ip: '127.0.0.1',
            heapPercent: '48',
            ramPercent: '65',
            cpu: '12',
            load1m: '0.45',
            nodeRole: 'dimr',
            master: '*',
            name: `${engineType === 'elasticsearch' ? 'es9' : 'os3'}-node-01`,
          },
        ]),
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found', path: pathname }));
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function start() {
  console.log('🚀 Starting Local Search Cluster Mock Services...');

  try {
    const esServer = await createClusterServer('elasticsearch', ES_PORT, es9ClusterData);
    console.log(`✅ Elasticsearch 9.x Mock running on http://127.0.0.1:${ES_PORT} (instance: sesdev01)`);

    const osServer = await createClusterServer('opensearch', OS_PORT, os3ClusterData);
    console.log(`✅ OpenSearch 3.x Mock running on    http://127.0.0.1:${OS_PORT} (instance: sesos01)`);
    console.log('\nReady! Press Ctrl+C to terminate.');

    const cleanup = () => {
      console.log('\nShutting down mock clusters...');
      esServer.close();
      osServer.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️  Port already in use: ${err.message}`);
      console.error('If mock clusters or real instances are already running on these ports, you can use them directly.');
      process.exit(1);
    } else {
      console.error('Fatal error starting mock clusters:', err);
      process.exit(1);
    }
  }
}

start();

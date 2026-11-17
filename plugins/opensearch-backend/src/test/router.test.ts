import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from '../service/router';
import type { SearchClustersConfig } from '../service/config';
import type { SearchClusterClient } from '../service/client';

describe('OpenSearch Backend Router', () => {
  const dummyConfig: SearchClustersConfig = {
    instances: [
      {
        name: 'sesdev01',
        type: 'elasticsearch',
        url: 'https://sesdev01.internal:9200',
        auth: { username: 'user', password: 'password' },
      },
      {
        name: 'sesos01',
        type: 'opensearch',
        url: 'https://sesos01.internal:9200',
      },
    ],
  };

  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };

  // Helper to simulate express request dispatch
  const simulateRequest = async (
    router: any,
    method: string,
    url: string,
  ): Promise<{ status: number; body: any }> => {
    return new Promise(resolve => {
      const [path, queryString] = url.split('?');
      const query: Record<string, string> = {};
      if (queryString) {
        new URLSearchParams(queryString).forEach((val, key) => {
          query[key] = val;
        });
      }

      const req: any = {
        method,
        url,
        path,
        query,
        headers: {},
      };

      let statusCode = 200;
      let responseBody: any = null;

      const res: any = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseBody = data;
          resolve({ status: statusCode, body: responseBody });
        },
        send(data: any) {
          responseBody = data;
          resolve({ status: statusCode, body: responseBody });
        },
      };

      router(req, res, (err: any) => {
        if (err) {
          resolve({ status: 500, body: { error: err.message } });
        } else {
          resolve({ status: 404, body: { error: 'Not Found' } });
        }
      });
    });
  };

  it('GET /health returns status ok', async () => {
    const router = await createRouter({
      config: dummyConfig,
      logger: mockLogger,
    });

    const res = await simulateRequest(router, 'GET', '/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('GET /instances returns sanitized list of instances', async () => {
    const router = await createRouter({
      config: dummyConfig,
      logger: mockLogger,
    });

    const res = await simulateRequest(router, 'GET', '/instances');
    assert.equal(res.status, 200);
    assert.equal(res.body.instances.length, 2);
    assert.equal(res.body.instances[0].name, 'sesdev01');
    assert.equal(res.body.instances[0].hasAuth, true);
    assert.equal(res.body.instances[0].authType, 'basic');
    // Ensure password is not exposed
    assert.equal(res.body.instances[0].password, undefined);
  });

  it('GET /instances/:instanceName/summary returns 404 when instance does not exist', async () => {
    const router = await createRouter({
      config: dummyConfig,
      logger: mockLogger,
    });

    const res = await simulateRequest(router, 'GET', '/instances/unknown-cluster/summary');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.name, 'InstanceNotFoundError');
  });

  it('GET /instances/:instanceName/summary returns cluster summary on success', async () => {
    const mockClient = {
      getSummary: async (indexPattern?: string) => ({
        instanceName: 'sesdev01',
        engineType: 'elasticsearch',
        clusterName: 'es-cluster',
        health: { status: 'green', numberOfNodes: 3 },
        version: { number: '8.10.0' },
        storage: { totalBytes: 1000, availableBytes: 500, usedBytes: 500, usedPercent: 50 },
        indices: [],
        configuredIndexPattern: indexPattern,
        fetchedAt: new Date().toISOString(),
      }),
    } as unknown as SearchClusterClient;

    const router = await createRouter({
      config: dummyConfig,
      logger: mockLogger,
      clientFactory: () => mockClient,
    });

    const res = await simulateRequest(
      router,
      'GET',
      '/instances/sesdev01/summary?indexPattern=payments-*',
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.instanceName, 'sesdev01');
    assert.equal(res.body.clusterName, 'es-cluster');
    assert.equal(res.body.configuredIndexPattern, 'payments-*');
    assert.equal(res.body.health.status, 'green');
  });
});

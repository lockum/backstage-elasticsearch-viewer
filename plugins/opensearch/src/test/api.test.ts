import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SearchClusterClient } from '../api/SearchClusterClient';

describe('SearchClusterClient API Client', () => {
  it('constructs correct URL and extracts JSON response', async () => {
    let capturedUrl = '';
    const mockDiscoveryApi = {
      getBaseUrl: async (pluginId: string) => `http://backstage.test/api/${pluginId}`,
    };

    const mockFetchApi = {
      fetch: async (url: string) => {
        capturedUrl = url;
        return {
          ok: true,
          json: async () => ({
            instanceName: 'sesdev01',
            engineType: 'elasticsearch',
            clusterName: 'es-cluster',
            health: { status: 'green' },
          }),
        };
      },
    };

    const client = new SearchClusterClient({
      discoveryApi: mockDiscoveryApi as any,
      fetchApi: mockFetchApi as any,
    });

    const result = await client.getSummary({
      instanceName: 'sesdev01',
      indexPattern: 'orders-*',
    });

    assert.equal(
      capturedUrl,
      'http://backstage.test/api/opensearch/instances/sesdev01/summary?indexPattern=orders-*',
    );
    assert.equal(result.instanceName, 'sesdev01');
    assert.equal(result.engineType, 'elasticsearch');
  });

  it('throws descriptive error on HTTP failure', async () => {
    const mockDiscoveryApi = {
      getBaseUrl: async () => 'http://backstage.test/api/opensearch',
    };

    const mockFetchApi = {
      fetch: async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: { message: "Instance 'missing-cluster' was not found" },
        }),
      }),
    };

    const client = new SearchClusterClient({
      discoveryApi: mockDiscoveryApi as any,
      fetchApi: mockFetchApi as any,
    });

    await assert.rejects(
      () => client.getSummary({ instanceName: 'missing-cluster' }),
      /Search Cluster API error \(404\): Instance 'missing-cluster' was not found/,
    );
  });
});

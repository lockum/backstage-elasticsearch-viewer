import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSearchClusterAvailable,
  getSearchClusterConfig,
  getSearchClusterTitle,
} from '../components/common/annotations';

describe('Entity Annotations Helper', () => {
  it('identifies Elasticsearch entity from es_instance annotation', () => {
    const entity: any = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'payment-consumer',
        annotations: {
          es_instance: 'sesdev01',
          index_name: 'consumer-index*',
        },
      },
    };

    assert.equal(isSearchClusterAvailable(entity), true);
    const config = getSearchClusterConfig(entity);
    assert.deepEqual(config, {
      instanceName: 'sesdev01',
      engineType: 'elasticsearch',
      indexPattern: 'consumer-index*',
    });
    assert.equal(getSearchClusterTitle(entity), 'Elasticsearch');
  });

  it('identifies OpenSearch entity from os_instance annotation', () => {
    const entity: any = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'search-service',
        annotations: {
          os_instance: 'sesos01',
        },
      },
    };

    assert.equal(isSearchClusterAvailable(entity), true);
    const config = getSearchClusterConfig(entity);
    assert.deepEqual(config, {
      instanceName: 'sesos01',
      engineType: 'opensearch',
      indexPattern: undefined,
    });
    assert.equal(getSearchClusterTitle(entity), 'OpenSearch');
  });

  it('returns false and undefined when neither annotation is present', () => {
    const entity: any = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'unrelated-service',
        annotations: {
          'backstage.io/managed-by': 'ops',
        },
      },
    };

    assert.equal(isSearchClusterAvailable(entity), false);
    assert.equal(getSearchClusterConfig(entity), undefined);
    assert.equal(getSearchClusterTitle(entity), 'Search Cluster');
  });

  it('handles null or missing metadata gracefully', () => {
    assert.equal(isSearchClusterAvailable(undefined), false);
    assert.equal(getSearchClusterConfig(undefined), undefined);
    assert.equal(getSearchClusterTitle(undefined), 'Search Cluster');
  });
});

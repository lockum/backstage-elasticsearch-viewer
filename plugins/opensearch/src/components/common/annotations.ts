import type { Entity } from '@backstage/catalog-model';
import type { EngineType } from '../../api/types';

export const ES_INSTANCE_ANNOTATION = 'es_instance';
export const OS_INSTANCE_ANNOTATION = 'os_instance';
export const INDEX_NAME_ANNOTATION = 'index_name';

export interface EntitySearchClusterConfig {
  instanceName: string;
  engineType: EngineType;
  indexPattern?: string;
}

/**
 * Checks if the entity has an Elasticsearch or OpenSearch cluster configured.
 */
export function isSearchClusterAvailable(entity?: Entity): boolean {
  if (!entity?.metadata?.annotations) {
    return false;
  }
  const annotations = entity.metadata.annotations;
  return Boolean(
    annotations[ES_INSTANCE_ANNOTATION] || annotations[OS_INSTANCE_ANNOTATION],
  );
}

/**
 * Parses search cluster annotations from a catalog entity.
 */
export function getSearchClusterConfig(
  entity?: Entity,
): EntitySearchClusterConfig | undefined {
  if (!entity?.metadata?.annotations) {
    return undefined;
  }

  const annotations = entity.metadata.annotations;
  const esInstance = annotations[ES_INSTANCE_ANNOTATION];
  const osInstance = annotations[OS_INSTANCE_ANNOTATION];
  const indexPattern = annotations[INDEX_NAME_ANNOTATION];

  if (esInstance) {
    return {
      instanceName: esInstance.trim(),
      engineType: 'elasticsearch',
      indexPattern: indexPattern?.trim() || undefined,
    };
  }

  if (osInstance) {
    return {
      instanceName: osInstance.trim(),
      engineType: 'opensearch',
      indexPattern: indexPattern?.trim() || undefined,
    };
  }

  return undefined;
}

/**
 * Returns dynamic tab title based on entity annotations ("Elasticsearch" or "OpenSearch").
 */
export function getSearchClusterTitle(entity?: Entity): string {
  const config = getSearchClusterConfig(entity);
  if (!config) {
    return 'Search Cluster';
  }
  return config.engineType === 'elasticsearch' ? 'Elasticsearch' : 'OpenSearch';
}

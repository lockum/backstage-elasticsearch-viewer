/**
 * Supported cluster engine types
 */
export type EngineType = 'elasticsearch' | 'opensearch';

/**
 * Health status indicators conforming to cluster health endpoints
 */
export type ClusterHealthStatus = 'green' | 'yellow' | 'red';

/**
 * Detailed health metrics of an Elasticsearch / OpenSearch cluster
 */
export interface ClusterHealth {
  status: ClusterHealthStatus;
  clusterName: string;
  numberOfNodes: number;
  numberOfDataNodes: number;
  activePrimaryShards: number;
  activeShards: number;
  relocatingShards: number;
  initializingShards: number;
  unassignedShards: number;
}

/**
 * Version and build metadata of the cluster
 */
export interface ClusterVersion {
  number: string;
  majorVersion?: number;
  buildFlavor?: string;
  buildType?: string;
  distribution?: string; // e.g. 'opensearch'
  luceneVersion?: string;
}

/**
 * Storage and document count metrics across the cluster
 */
export interface ClusterStorage {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  usedPercent: number;
  indicesStoreSizeBytes: number;
  totalDocs: number;
  jvmHeapUsedBytes?: number;
  jvmHeapMaxBytes?: number;
  jvmHeapUsedPercent?: number;
}

/**
 * Summary of an individual index matching an index pattern
 */
export interface IndexSummary {
  name: string;
  health: ClusterHealthStatus;
  status: 'open' | 'close';
  docsCount: number;
  storeSizeBytes: number;
  storeSizeFormatted: string;
  creationDate?: number;
  creationDateFormatted?: string;
}

/**
 * Consolidated summary payload returned by the backend API
 */
export interface SearchClusterSummary {
  instanceName: string;
  engineType: EngineType;
  clusterName: string;
  health: ClusterHealth;
  version: ClusterVersion;
  storage: ClusterStorage;
  indices: IndexSummary[];
  configuredIndexPattern?: string;
  fetchedAt: string;
}

/**
 * Health endpoint response
 */
export interface HealthResponse {
  status: 'ok';
}

export type EngineType = 'elasticsearch' | 'opensearch';

export type ClusterHealthStatus = 'green' | 'yellow' | 'red';

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

export interface ClusterVersion {
  number: string;
  majorVersion?: number;
  buildFlavor?: string;
  buildType?: string;
  distribution?: string;
  luceneVersion?: string;
}

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

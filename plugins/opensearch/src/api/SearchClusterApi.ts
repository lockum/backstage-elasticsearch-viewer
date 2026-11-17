import { createApiRef } from '@backstage/core-plugin-api';
import { SearchClusterSummary } from './types';

export interface GetSummaryOptions {
  instanceName: string;
  indexPattern?: string;
}

export interface SearchClusterApi {
  getSummary(options: GetSummaryOptions): Promise<SearchClusterSummary>;
  getHealth(): Promise<{ status: string }>;
}

export const searchClusterApiRef = createApiRef<SearchClusterApi>({
  id: 'plugin.opensearch.service',
});

import type { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import type { GetSummaryOptions, SearchClusterApi } from './SearchClusterApi';
import type { SearchClusterSummary } from './types';

export class SearchClusterClient implements SearchClusterApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  private async getBaseUrl(): Promise<string> {
    return this.discoveryApi.getBaseUrl('opensearch');
  }

  async getHealth(): Promise<{ status: string }> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Failed to check plugin health: ${response.statusText}`);
    }
    return response.json();
  }

  async getSummary(options: GetSummaryOptions): Promise<SearchClusterSummary> {
    const { instanceName, indexPattern } = options;
    const baseUrl = await this.getBaseUrl();
    const query = new URLSearchParams();
    if (indexPattern) {
      query.set('indexPattern', indexPattern);
    }

    const queryStr = query.toString();
    const url = `${baseUrl}/instances/${encodeURIComponent(instanceName)}/summary${
      queryStr ? `?${queryStr}` : ''
    }`;

    const response = await this.fetchApi.fetch(url);

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errJson = await response.json();
        message = errJson.error?.message || message;
      } catch {
        // Fall back to status text
      }
      throw new Error(`Search Cluster API error (${response.status}): ${message}`);
    }

    return response.json();
  }
}

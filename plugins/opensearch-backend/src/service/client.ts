import { Agent as UndiciAgent } from 'undici';
import {
  type SearchClusterInstanceConfig,
  resolveCaCertificate,
} from './config';
import {
  ClusterAuthenticationError,
  UpstreamClusterError,
} from './errors';
import type {
  ClusterHealth,
  ClusterHealthStatus,
  ClusterStorage,
  ClusterVersion,
  IndexSummary,
  SearchClusterSummary,
} from './types';

export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug?(message: string, meta?: any): void;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

export class SearchClusterClient {
  private readonly config: SearchClusterInstanceConfig;
  private readonly logger?: Logger;
  private readonly baseUrl: string;
  private readonly authHeader?: string;
  private readonly dispatcher?: UndiciAgent;

  constructor(config: SearchClusterInstanceConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
    this.baseUrl = config.url.replace(/\/+$/, '');

    // Setup Auth Header
    if (config.auth?.username && config.auth?.password) {
      const encoded = Buffer.from(
        `${config.auth.username}:${config.auth.password}`,
      ).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else if (config.auth?.bearerToken) {
      this.authHeader = `Bearer ${config.auth.bearerToken}`;
    } else if (config.auth?.apiKey) {
      this.authHeader = `ApiKey ${config.auth.apiKey}`;
    }

    // Setup TLS Dispatcher if needed
    if (config.tls?.ca || config.tls?.rejectUnauthorized !== undefined) {
      const caPem = resolveCaCertificate(config.tls.ca);
      this.dispatcher = new UndiciAgent({
        connect: {
          rejectUnauthorized: config.tls.rejectUnauthorized ?? true,
          ca: caPem ? Buffer.from(caPem) : undefined,
        },
      });
    }
  }

  private async request<T>(path: string, options: { allow404?: boolean } = {}): Promise<T | null> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const timeoutMs = this.config.requestTimeoutMs ?? 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'backstage-search-cluster-plugin/1.0',
    };

    if (this.authHeader) {
      headers.Authorization = this.authHeader;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        // @ts-expect-error - undici dispatcher in node fetch
        dispatcher: this.dispatcher,
      });

      if (response.status === 401 || response.status === 403) {
        throw new ClusterAuthenticationError(
          this.config.name,
          `HTTP ${response.status} ${response.statusText}`,
        );
      }

      if (response.status === 404) {
        if (options.allow404) {
          return null;
        }
        throw new UpstreamClusterError(
          this.config.name,
          `Endpoint ${path} returned 404 Not Found`,
        );
      }

      if (!response.ok) {
        let errBody = '';
        try {
          errBody = await response.text();
        } catch {
          // Ignore body read error
        }
        throw new UpstreamClusterError(
          this.config.name,
          `HTTP ${response.status}: ${errBody.slice(0, 300) || response.statusText}`,
        );
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        return null;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof ClusterAuthenticationError || error instanceof UpstreamClusterError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamClusterError(
          this.config.name,
          `Connection timed out after ${timeoutMs}ms while requesting ${path}`,
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Search cluster connection failed', {
        instance: this.config.name,
        path,
        error: message,
      });

      throw new UpstreamClusterError(this.config.name, message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getHealth(): Promise<ClusterHealth> {
    const data = await this.request<any>('/_cluster/health');
    const rawStatus = String(data?.status || 'red').toLowerCase();
    const status: ClusterHealthStatus =
      rawStatus === 'green' || rawStatus === 'yellow' || rawStatus === 'red'
        ? rawStatus
        : 'red';

    return {
      status,
      clusterName: data?.cluster_name || 'unknown-cluster',
      numberOfNodes: Number(data?.number_of_nodes ?? 0),
      numberOfDataNodes: Number(data?.number_of_data_nodes ?? 0),
      activePrimaryShards: Number(data?.active_primary_shards ?? 0),
      activeShards: Number(data?.active_shards ?? 0),
      relocatingShards: Number(data?.relocating_shards ?? 0),
      initializingShards: Number(data?.initializing_shards ?? 0),
      unassignedShards: Number(data?.unassigned_shards ?? 0),
    };
  }

  async getVersion(): Promise<ClusterVersion> {
    const data = await this.request<any>('/');
    const v = data?.version || {};

    return {
      number: String(v.number || 'unknown'),
      distribution: v.distribution ? String(v.distribution) : undefined,
      buildFlavor: v.build_flavor ? String(v.build_flavor) : undefined,
      buildType: v.build_type ? String(v.build_type) : undefined,
      luceneVersion: v.lucene_version ? String(v.lucene_version) : undefined,
    };
  }

  async getStats(): Promise<ClusterStorage> {
    const data = await this.request<any>('/_cluster/stats');
    const indices = data?.indices || {};
    const nodes = data?.nodes || {};
    const fs = nodes.fs || {};
    const jvm = nodes.jvm?.mem || {};

    const totalBytes = Number(fs.total_in_bytes ?? 0);
    const availableBytes = Number(fs.available_in_bytes ?? 0);
    const usedBytes = Math.max(0, totalBytes - availableBytes);
    const usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
    const indicesStoreSizeBytes = Number(indices.store?.size_in_bytes ?? 0);
    const totalDocs = Number(indices.docs?.count ?? 0);

    const jvmHeapUsedBytes = jvm.heap_used_in_bytes ? Number(jvm.heap_used_in_bytes) : undefined;
    const jvmHeapMaxBytes = jvm.heap_max_in_bytes ? Number(jvm.heap_max_in_bytes) : undefined;
    const jvmHeapUsedPercent =
      jvmHeapMaxBytes && jvmHeapMaxBytes > 0 && jvmHeapUsedBytes !== undefined
        ? (jvmHeapUsedBytes / jvmHeapMaxBytes) * 100
        : undefined;

    return {
      totalBytes,
      availableBytes,
      usedBytes,
      usedPercent: parseFloat(usedPercent.toFixed(1)),
      indicesStoreSizeBytes,
      totalDocs,
      jvmHeapUsedBytes,
      jvmHeapMaxBytes,
      jvmHeapUsedPercent: jvmHeapUsedPercent ? parseFloat(jvmHeapUsedPercent.toFixed(1)) : undefined,
    };
  }

  async getMatchingIndices(indexPattern: string): Promise<IndexSummary[]> {
    if (!indexPattern || indexPattern.trim() === '') {
      return [];
    }

    const trimmed = indexPattern.trim();
    // Query _cat/indices with JSON formatting and sorted by creation date descending
    const catPath = `/_cat/indices/${encodeURIComponent(trimmed)}?format=json&s=creation.date:desc&h=index,health,status,docs.count,store.size,creation.date`;

    try {
      const data = await this.request<any[]>(catPath, { allow404: true });
      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Sort descending by creation.date fallback to index name
      const sorted = [...data].sort((a, b) => {
        const timeA = Number(a['creation.date'] ?? 0);
        const timeB = Number(b['creation.date'] ?? 0);
        if (timeA !== timeB) return timeB - timeA;
        return String(b.index || '').localeCompare(String(a.index || ''));
      });

      // Slice top 7 most recent
      const top7 = sorted.slice(0, 7);

      return top7.map(item => {
        const rawHealth = String(item.health || 'red').toLowerCase();
        const health: ClusterHealthStatus =
          rawHealth === 'green' || rawHealth === 'yellow' || rawHealth === 'red'
            ? rawHealth
            : 'red';

        const docsCount = Number(item['docs.count'] ?? 0);
        const rawStoreSize = item['store.size'] || '0b';
        const creationTime = item['creation.date'] ? Number(item['creation.date']) : undefined;

        return {
          name: String(item.index || ''),
          health,
          status: item.status === 'close' ? 'close' : 'open',
          docsCount: Number.isNaN(docsCount) ? 0 : docsCount,
          storeSizeBytes: 0,
          storeSizeFormatted: String(rawStoreSize),
          creationDate: creationTime,
          creationDateFormatted: creationTime
            ? new Date(creationTime).toISOString()
            : undefined,
        };
      });
    } catch (error) {
      // In ES/OS, if an index pattern does not match any index, it might return 404 or index_not_found_exception
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes('index_not_found_exception') ||
        msg.includes('no such index') ||
        msg.includes('404')
      ) {
        return [];
      }
      throw error;
    }
  }

  async getSummary(indexPattern?: string): Promise<SearchClusterSummary> {
    const [health, version, storage, indices] = await Promise.all([
      this.getHealth(),
      this.getVersion(),
      this.getStats(),
      indexPattern ? this.getMatchingIndices(indexPattern) : Promise.resolve([]),
    ]);

    // Infer engine type: if distribution is opensearch or config type is opensearch
    const engineType =
      version.distribution?.toLowerCase() === 'opensearch' ||
      this.config.type === 'opensearch'
        ? 'opensearch'
        : 'elasticsearch';

    return {
      instanceName: this.config.name,
      engineType,
      clusterName: health.clusterName,
      health,
      version,
      storage,
      indices,
      configuredIndexPattern: indexPattern,
      fetchedAt: new Date().toISOString(),
    };
  }
}

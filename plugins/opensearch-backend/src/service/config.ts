import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Config } from '@backstage/config';

export const SearchClusterAuthSchema = z
  .object({
    username: z.string().optional(),
    password: z.string().optional(),
    bearerToken: z.string().optional(),
    apiKey: z.string().optional(),
  })
  .optional();

export const SearchClusterTlsSchema = z
  .object({
    ca: z.string().optional(),
    rejectUnauthorized: z.boolean().default(true),
    cert: z.string().optional(),
    key: z.string().optional(),
  })
  .optional();

export const SearchClusterInstanceConfigSchema = z.object({
  name: z.string().min(1, 'Instance name is required'),
  type: z.enum(['elasticsearch', 'opensearch']),
  url: z.string().url('A valid cluster URL is required (e.g. https://es.example.com:9200)'),
  auth: SearchClusterAuthSchema,
  tls: SearchClusterTlsSchema,
  requestTimeoutMs: z.number().int().positive().default(8000).optional(),
});

export const SearchClustersConfigSchema = z.object({
  instances: z.array(SearchClusterInstanceConfigSchema).default([]),
});

export type SearchClusterAuth = z.infer<typeof SearchClusterAuthSchema>;
export type SearchClusterTls = z.infer<typeof SearchClusterTlsSchema>;
export type SearchClusterInstanceConfig = z.infer<typeof SearchClusterInstanceConfigSchema>;
export type SearchClustersConfig = z.infer<typeof SearchClustersConfigSchema>;

/**
 * Resolves TLS CA data: returns inline PEM if already provided, or reads from the file path.
 */
export function resolveCaCertificate(caInput?: string): string | undefined {
  if (!caInput) {
    return undefined;
  }

  const trimmed = caInput.trim();
  if (trimmed.startsWith('-----BEGIN CERTIFICATE-----')) {
    return trimmed;
  }

  // Treat as file path
  try {
    const resolvedPath = path.isAbsolute(trimmed)
      ? trimmed
      : path.resolve(process.cwd(), trimmed);
    return fs.readFileSync(resolvedPath, 'utf8').trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read TLS CA certificate file from path "${trimmed}": ${message}`,
    );
  }
}

/**
 * Sanitizes instance configuration for safe logging without leaking secrets.
 */
export function sanitizeInstanceConfig(
  config: SearchClusterInstanceConfig,
): Record<string, unknown> {
  return {
    name: config.name,
    type: config.type,
    url: config.url,
    hasAuth: Boolean(
      config.auth?.username ||
        config.auth?.password ||
        config.auth?.bearerToken ||
        config.auth?.apiKey,
    ),
    authType: config.auth?.bearerToken
      ? 'bearer'
      : config.auth?.apiKey
      ? 'apiKey'
      : config.auth?.username
      ? 'basic'
      : 'none',
    tls: config.tls
      ? {
          rejectUnauthorized: config.tls.rejectUnauthorized,
          hasCustomCa: Boolean(config.tls.ca),
        }
      : undefined,
    requestTimeoutMs: config.requestTimeoutMs,
  };
}

/**
 * Parses and validates search cluster configuration from Backstage Config
 */
export function parseSearchClustersConfig(config: Config): SearchClustersConfig {
  const rootData = config.getOptional('searchClusters') ?? {};
  const parsed = SearchClustersConfigSchema.safeParse(rootData);

  if (!parsed.success) {
    const formattedErrors = parsed.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(
      `Invalid 'searchClusters' configuration in app-config: ${formattedErrors}`,
    );
  }

  return parsed.data;
}

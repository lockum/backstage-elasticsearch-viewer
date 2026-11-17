import express, { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Config } from '@backstage/config';
import {
  parseSearchClustersConfig,
  sanitizeInstanceConfig,
  type SearchClustersConfig,
} from './config';
import {
  SearchClusterError,
  InstanceNotFoundError,
} from './errors';
import { SearchClusterClient, type Logger } from './client';

export interface RouterOptions {
  config: Config | SearchClustersConfig;
  logger: Logger;
  clientFactory?: (instanceConfig: any, logger: Logger) => SearchClusterClient;
}

const SummaryQuerySchema = z.object({
  indexPattern: z.string().optional(),
});

export async function createRouter(options: RouterOptions): Promise<Router> {
  const { logger } = options;

  // Resolve config: either already parsed or read from Backstage Config
  const clusterConfig: SearchClustersConfig =
    'instances' in options.config && Array.isArray(options.config.instances)
      ? options.config
      : parseSearchClustersConfig(options.config as Config);

  // Map instances by lowercase name for case-insensitive matching
  const instanceMap = new Map(
    clusterConfig.instances.map(inst => [inst.name.toLowerCase(), inst]),
  );

  const clientCache = new Map<string, SearchClusterClient>();

  const getClient = (name: string): SearchClusterClient => {
    const key = name.toLowerCase();
    let client = clientCache.get(key);
    if (!client) {
      const config = instanceMap.get(key);
      if (!config) {
        throw new InstanceNotFoundError(name);
      }
      if (options.clientFactory) {
        client = options.clientFactory(config, logger);
      } else {
        client = new SearchClusterClient(config, logger);
      }
      clientCache.set(key, client);
    }
    return client;
  };

  const router = Router();
  router.use(express.json());

  // 1. Health check endpoint for Backstage
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // 2. List configured instances (sanitized metadata)
  router.get('/instances', (_req: Request, res: Response) => {
    const sanitized = clusterConfig.instances.map(sanitizeInstanceConfig);
    res.json({ instances: sanitized });
  });

  // 3. Cluster summary endpoint
  router.get('/instances/:instanceName/summary', async (req: Request, res: Response) => {
    const { instanceName } = req.params;
    if (!instanceName || instanceName.trim() === '') {
      res.status(400).json({
        error: {
          name: 'ValidationError',
          message: 'Parameter :instanceName cannot be empty',
          statusCode: 400,
        },
      });
      return;
    }

    const queryParse = SummaryQuerySchema.safeParse(req.query);
    if (!queryParse.success) {
      res.status(400).json({
        error: {
          name: 'ValidationError',
          message: queryParse.error.message,
          statusCode: 400,
        },
      });
      return;
    }

    const { indexPattern } = queryParse.data;

    try {
      logger.info('Fetching cluster summary', {
        instance: instanceName,
        indexPattern: indexPattern || '(none)',
      });

      const client = getClient(instanceName);
      const summary = await client.getSummary(indexPattern);

      res.json(summary);
    } catch (error) {
      const isSearchError = error instanceof SearchClusterError;
      const statusCode = isSearchError ? error.statusCode : 500;
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Failed to get cluster summary', {
        instance: instanceName,
        indexPattern,
        error: errorMessage,
        statusCode,
      });

      res.status(statusCode).json({
        error: {
          name: errorName,
          message: errorMessage,
          statusCode,
        },
      });
    }
  });

  return router;
}

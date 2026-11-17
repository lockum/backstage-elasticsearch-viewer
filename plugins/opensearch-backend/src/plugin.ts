import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 * OpenSearch & Elasticsearch Backstage backend plugin
 * Built for Backstage's New Backend System
 */
export const opensearchPlugin = createBackendPlugin({
  pluginId: 'opensearch',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        rootConfig: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, rootConfig }) {
        logger.info('Initializing OpenSearch & Elasticsearch backend plugin');
        const router = await createRouter({
          config: rootConfig,
          logger,
        });

        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});

import {
  createApiFactory,
  createComponentExtension,
  createPlugin,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { searchClusterApiRef } from './api/SearchClusterApi';
import { SearchClusterClient } from './api/SearchClusterClient';

export const opensearchPlugin = createPlugin({
  id: 'opensearch',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: searchClusterApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new SearchClusterClient({ discoveryApi, fetchApi }),
    }),
  ],
});

/**
 * Overview card for the Backstage Entity Overview tab
 */
export const EntitySearchOverviewCard = opensearchPlugin.provide(
  createComponentExtension({
    name: 'EntitySearchOverviewCard',
    component: {
      lazy: () =>
        import('./components/EntitySearchOverviewCard').then(
          m => m.EntitySearchOverviewCard,
        ),
    },
  }),
);

/**
 * Full-width tab content for dedicated Elasticsearch / OpenSearch entity view
 */
export const EntitySearchContent = opensearchPlugin.provide(
  createRoutableExtension({
    name: 'EntitySearchContent',
    component: () =>
      import('./components/EntitySearchContent').then(
        m => m.EntitySearchContent,
      ),
    mountPoint: rootRouteRef,
  }),
);

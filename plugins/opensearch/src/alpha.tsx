import {
  createFrontendPlugin,
  ApiBlueprint,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  ExtensionDefinition,
  FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import {
  EntityCardBlueprint,
  EntityContentBlueprint,
} from '@backstage/plugin-catalog-react/alpha';
import { searchClusterApiRef } from './api/SearchClusterApi';
import { SearchClusterClient } from './api/SearchClusterClient';
import { isSearchClusterAvailable } from './components/common/annotations';

/**
 * OpenSearch & Elasticsearch utility API extension
 */
export const searchClusterApiExtension: ExtensionDefinition = ApiBlueprint.make({
  name: 'service',
  params: defineParams =>
    defineParams(
      createApiFactory({
        api: searchClusterApiRef,
        deps: {
          discoveryApi: discoveryApiRef,
          fetchApi: fetchApiRef,
        },
        factory: ({ discoveryApi, fetchApi }) =>
          new SearchClusterClient({ discoveryApi, fetchApi }),
      }),
    ),
});

/**
 * Entity Overview Card extension for the Catalog
 */
export const entitySearchOverviewCardExtension: ExtensionDefinition =
  EntityCardBlueprint.make({
    name: 'overview-card',
    params: {
      filter: isSearchClusterAvailable,
      loader: () =>
        import('./components/EntitySearchOverviewCard').then(m => (
          <m.EntitySearchOverviewCard />
        )),
    },
  });

/**
 * Dedicated Entity Tab extension for the Catalog (/search-cluster)
 */
export const entitySearchContentExtension: ExtensionDefinition =
  EntityContentBlueprint.make({
    name: 'entity-content',
    params: {
      path: '/search-cluster',
      title: 'Search Cluster',
      filter: isSearchClusterAvailable,
      loader: () =>
        import('./components/EntitySearchContent').then(m => (
          <m.EntitySearchContent />
        )),
    },
  });

const opensearchPlugin: FrontendPlugin = createFrontendPlugin({
  pluginId: 'opensearch',
  extensions: [
    searchClusterApiExtension,
    entitySearchOverviewCardExtension,
    entitySearchContentExtension,
  ],
});

export default opensearchPlugin;

# Installation Guide

This guide covers installing and configuring the **OpenSearch & Elasticsearch Backstage Plugin Suite** in any Backstage instance.

---

## Package Status & Installation Options

The plugins are organized as a monorepo containing two packages:
- **`@lockum/opensearch-plugin-backend`**: Backend service connecting to clusters, handling TLS CA certificates, and normalizing metrics.
- **`@lockum/opensearch-plugin`**: Frontend plugin delivering the Overview Health Card and the `/search-cluster` dashboard.

Choose the installation method that fits your environment:
- **Option 1 (Recommended for Custom / Internal Deployments)**: Clone / Copy into Backstage `plugins/` directory.
- **Option 2 (Git Submodule)**: Link directly as a Git submodule.
- **Option 3 (NPM Registry)**: Install via `yarn add` if publishing to NPM.

---

## Visual Preview

### 1. Component Overview Card
Displays cluster status, node count, shard allocation, disk usage, and monitored index health directly on the entity's Overview tab:

![Overview Health Card](../images/overview-health-card.png)

### 2. Dedicated Search Cluster Tab
Provides comprehensive telemetry, memory/JVM breakdown, and recent indices inspection:

![Search Cluster Dashboard](../images/search-cluster-tab.jpg)

---

## Step 1: Install the Plugins

### Option 1: Copy to your Backstage `plugins/` Directory (Recommended)

In Backstage apps, the standard `package.json` configures workspaces as:
```json
"workspaces": [
  "packages/*",
  "plugins/*"
]
```
Any folder placed in `plugins/` is automatically discovered and linked as a workspace package.

1. Clone or copy the plugin folders into your Backstage repository:
   ```bash
   # From your Backstage root directory:
   mkdir -p plugins

   # If you cloned this repo to /tmp/search-plugins:
   cp -r /path/to/backstage-opensearch-plugins/plugins/opensearch plugins/
   cp -r /path/to/backstage-opensearch-plugins/plugins/opensearch-backend plugins/
   ```

2. Add the workspace dependencies to your app and backend:
   ```bash
   # In packages/app/package.json dependencies:
   # "@lockum/opensearch-plugin": "workspace:^"

   # In packages/backend/package.json dependencies:
   # "@lockum/opensearch-plugin-backend": "workspace:^"

   # Run yarn to link the workspaces
   yarn install
   ```

---

### Option 2: Git Submodule

If you keep the plugins in a separate repository on GitHub (e.g. `https://github.com/lockum/backstage-opensearch-plugins`):

```bash
# Add as a submodule in plugins/search-plugins
git submodule add https://github.com/lockum/backstage-opensearch-plugins.git plugins/search-plugins

# Ensure your root package.json includes "plugins/**" in workspaces:
# "workspaces": ["packages/*", "plugins/*", "plugins/search-plugins/plugins/*"]
yarn install
```

---

### Option 3: Official NPM Registry (If Published)

If the package maintainer publishes the packages to the public NPM registry:

```bash
# Add backend plugin to packages/backend
yarn --cwd packages/backend add @lockum/opensearch-plugin-backend

# Add frontend plugin to packages/app
yarn --cwd packages/app add @lockum/opensearch-plugin
```

#### How to Publish to NPM (For Maintainers)
To make the packages installable via `yarn add @lockum/...`:
```bash
# 1. Log in to npm under the lockum scope or user account
npm login

# 2. Build and publish backend
cd plugins/opensearch-backend
yarn build
npm publish --access public

# 3. Build and publish frontend
cd ../opensearch
yarn build
npm publish --access public
```

---

## Step 2: Configure the Backend

### Modern Backstage (New Backend System)

In `packages/backend/src/index.ts`, register the plugin:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins ...

// Add OpenSearch & Elasticsearch plugin
backend.add(import('@lockum/opensearch-plugin-backend'));

backend.start();
```

### Classic Backstage (Legacy Backend System)

If your Backstage instance uses the legacy backend, create `packages/backend/src/plugins/opensearch.ts`:

```typescript
import { createRouter } from '@lockum/opensearch-plugin-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
  });
}
```

And in `packages/backend/src/index.ts`:

```typescript
import opensearch from './plugins/opensearch';

// Inside router mounting:
const opensearchEnv = useHotMemoize(previous => createEnv('opensearch'));
apiRouter.use('/opensearch', await opensearch(opensearchEnv));
```

---

## Step 3: Configure the Frontend

### Modern Backstage (New Frontend System / Declarative Integration)

In `packages/app/src/App.tsx`, include the plugin in your `createApp` features:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import opensearchPlugin from '@lockum/opensearch-plugin/alpha';

export default createApp({
  features: [
    catalogPlugin,
    opensearchPlugin, // Automatically registers Overview Card and /search-cluster tab
  ],
});
```

### Classic Backstage (JSX EntityPage Integration)

In `packages/app/src/components/catalog/EntityPage.tsx`:

1. Import the components and availability predicate:
   ```tsx
   import {
     EntitySearchOverviewCard,
     EntitySearchContent,
     isSearchClusterAvailable,
   } from '@lockum/opensearch-plugin';
   ```

2. Add the Overview card to `overviewContent`:
   ```tsx
   const overviewContent = (
     <Grid container spacing={3} alignItems="stretch">
       {/* ... other cards (About, Links) ... */}

       <EntitySwitch>
         <EntitySwitch.Case if={isSearchClusterAvailable}>
           <Grid item md={6} xs={12}>
             <EntitySearchOverviewCard />
           </Grid>
         </EntitySwitch.Case>
       </EntitySwitch>
     </Grid>
   );
   ```

3. Add the dedicated Search Cluster tab to `serviceEntityPage` or `defaultEntityPage`:
   ```tsx
   <EntityLayout.Route
     if={isSearchClusterAvailable}
     path="/search-cluster"
     title="Search Cluster"
   >
     <EntitySearchContent />
   </EntityLayout.Route>
   ```

---

## Step 4: Configure `app-config.yaml`

Define your cluster instances under `searchClusters.instances`:

```yaml
searchClusters:
  instances:
    # OpenSearch 1.x, 2.x, or 3.x
    - name: sesos01
      type: opensearch
      url: https://opensearch.internal.net:9200
      auth:
        username: ${OPENSEARCH_USER}
        password: ${OPENSEARCH_PASSWORD}
      requestTimeoutMs: 5000

    # Elasticsearch 7.x, 8.x, or 9.x
    - name: sesdev01
      type: elasticsearch
      url: https://es.internal.net:9200
      apiKey: ${ELASTICSEARCH_API_KEY}
      requestTimeoutMs: 5000
```

---

## Step 5: Annotate Catalog Entities

Add the search instance and index pattern to your service's `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: search-catalog-service
  description: Product search service backed by OpenSearch
  annotations:
    os_instance: sesos01       # Or es_instance for Elasticsearch
    index_name: search-*       # Wildcard pattern for monitored indices
spec:
  type: service
  lifecycle: production
  owner: team-search
```

Once saved and ingested into the Backstage Catalog:
1. Open the component in Backstage (`/catalog/default/component/search-catalog-service`).
2. The **Overview** tab will render the **Cluster & Index Health** card.
3. The **Search Cluster** tab will show the full metrics dashboard and recent indices table.

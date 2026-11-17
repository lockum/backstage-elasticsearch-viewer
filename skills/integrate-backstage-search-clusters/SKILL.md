---
name: integrate-backstage-search-clusters
description: Step-by-step instructions for AI coding agents to integrate, configure, wire, and verify the OpenSearch and Elasticsearch Backstage plugins (@lockum/opensearch-plugin and @lockum/opensearch-plugin-backend) into any target Backstage application.
---

# Agent Skill: Integrate OpenSearch & Elasticsearch Plugins into Backstage

This skill instructs an AI coding agent on how to reliably install, configure, wire, and verify the **OpenSearch & Elasticsearch Backstage Plugin Suite** (`@lockum/opensearch-plugin` and `@lockum/opensearch-plugin-backend`) in any requestor's Backstage repository.

---

## 1. Goal & Requirements
- Enable real-time cluster health and index monitoring for **OpenSearch (1.x, 2.x, 3.x)** and **Elasticsearch (7.x, 8.x, 9.x)**.
- Support both **New Backend System** and **Legacy Backend System**.
- Support both **New Frontend System (Declarative `/alpha`)** and **Legacy Frontend System (`EntityPage.tsx`)**.
- Provide a responsive **Overview Health Card** on component entity pages and a dedicated **/search-cluster** dashboard tab.

---

## 2. Phase 1: Environment & System Detection

Before modifying code, the agent MUST inspect the target Backstage repository to determine its architecture:

### Check 1: Backend System
Examine `packages/backend/src/index.ts`:
- If it uses `createBackend()` from `@backstage/backend-defaults`, it is using the **New Backend System**.
- If it uses `makeCreateEnv` or manually mounts Express routers with `PluginEnvironment`, it is using the **Legacy Backend System**.

### Check 2: Frontend System
Examine `packages/app/src/App.tsx`:
- If it uses `createApp({ features: [...] })` from `@backstage/frontend-defaults`, it is using the **New Frontend System**.
- If it uses `createApp()` with JSX routes (`<FlatRoutes>`, `<Route path="/catalog" element={<CatalogIndexPage />} />`), it is using the **Legacy Frontend System**.
- If `packages/app/src/components/catalog/EntityPage.tsx` exists, JSX entity page modifications are required for the legacy frontend.

---

## 3. Phase 2: Install Package Dependencies

Run the package manager commands from the Backstage root directory:

```bash
# Add backend plugin to packages/backend
yarn --cwd packages/backend add @lockum/opensearch-plugin-backend

# Add frontend plugin to packages/app
yarn --cwd packages/app add @lockum/opensearch-plugin
```

*(If the plugins are imported as monorepo local workspaces, add `"@lockum/opensearch-plugin-backend": "workspace:^"` to `packages/backend/package.json` and `"@lockum/opensearch-plugin": "workspace:^"` to `packages/app/package.json`)*

---

## 4. Phase 3: Backend Integration

### Option A: New Backend System (`packages/backend/src/index.ts`)
Add the plugin module import:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... existing plugins ...

// Add OpenSearch & Elasticsearch backend plugin
backend.add(import('@lockum/opensearch-plugin-backend'));

backend.start();
```

> **Important Auth Note**: The backend plugin exposes an unauthenticated auth policy for read-only routes (`httpRouter.addAuthPolicy({ path: '/', allow: 'unauthenticated' })`), ensuring catalog entity pages can fetch cluster telemetry without 401 errors.

---

### Option B: Legacy Backend System (`packages/backend/src/plugins/opensearch.ts`)
Create `packages/backend/src/plugins/opensearch.ts`:

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

In `packages/backend/src/index.ts`, mount the router under `/api/opensearch`:

```typescript
import opensearch from './plugins/opensearch';

// Inside router mounting:
const opensearchEnv = useHotMemoize(previous => createEnv('opensearch'));
apiRouter.use('/opensearch', await opensearch(opensearchEnv));
```

---

## 5. Phase 4: Frontend Integration

### Option A: New Frontend System (`packages/app/src/App.tsx`)
Import the alpha plugin feature and pass it to `createApp`:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import opensearchPlugin from '@lockum/opensearch-plugin/alpha';

export default createApp({
  features: [
    catalogPlugin,
    opensearchPlugin, // Registers Overview Card and /search-cluster tab automatically
  ],
});
```

---

### Option B: Legacy Frontend System (`EntityPage.tsx`)
In `packages/app/src/components/catalog/EntityPage.tsx`:

1. Import the components and availability predicate:
   ```tsx
   import {
     EntitySearchOverviewCard,
     EntitySearchContent,
     isSearchClusterAvailable,
   } from '@lockum/opensearch-plugin';
   ```

2. Add `EntitySearchOverviewCard` to `overviewContent`:
   ```tsx
   const overviewContent = (
     <Grid container spacing={3} alignItems="stretch">
       {/* ... other overview cards ... */}

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

3. Add `EntitySearchContent` as a tab route to `serviceEntityPage`:
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

## 6. Phase 5: Cluster Configuration (`app-config.yaml`)

Add the search cluster configurations under `searchClusters.instances` in `app-config.yaml`:

```yaml
searchClusters:
  instances:
    # OpenSearch Instance (1.x, 2.x, or 3.x)
    - name: sesos01
      type: opensearch
      url: https://opensearch.internal.net:9200
      auth:
        username: ${OPENSEARCH_USERNAME}
        password: ${OPENSEARCH_PASSWORD}
      requestTimeoutMs: 5000

    # Elasticsearch Instance (7.x, 8.x, or 9.x)
    - name: sesdev01
      type: elasticsearch
      url: https://elasticsearch.internal.net:9200
      apiKey: ${ELASTICSEARCH_API_KEY}
      requestTimeoutMs: 5000

    # Custom TLS / Self-Signed CA Example
    - name: ses-secure
      url: https://secure-cluster.internal:9200
      caCert: /etc/ssl/certs/internal-ca.pem
```

---

## 7. Phase 6: Annotate Catalog Entities

Add search annotations to any component in `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: search-service
  description: Search query and indexing worker
  annotations:
    # 1. Cluster instance name (must match an instance 'name' in app-config.yaml)
    os_instance: sesos01       # For OpenSearch
    # es_instance: sesdev01    # For Elasticsearch
    
    # 2. Index pattern to monitor (supports wildcards)
    index_name: search-*
spec:
  type: service
  lifecycle: production
  owner: guests
```

---

## 8. Phase 7: Verification & Testing

The agent MUST perform the following checks to confirm successful integration:

1. **Type Checking**:
   ```bash
   yarn tsc
   ```
   Ensure zero TypeScript compilation errors.

2. **Verify Upstream Endpoints**:
   If local search cluster instances are not running, run the included mock server:
   ```bash
   node scripts/mock-clusters.mjs &
   ```

3. **Verify Backstage Router Endpoints**:
   ```bash
   # Health check
   curl http://localhost:7007/api/opensearch/health
   # Expected: {"status":"ok"}

   # Instances list
   curl http://localhost:7007/api/opensearch/instances
   # Expected: JSON array of configured cluster instances

   # Instance summary
   curl "http://localhost:7007/api/opensearch/instances/sesos01/summary?indexPattern=search-*"
   # Expected: HTTP 200 with cluster health, storage, and indices
   ```

4. **Verify Frontend UI**:
   - Open `http://localhost:3000/catalog/default/component/search-service`.
   - Verify that the **Overview** tab renders the **Cluster Health & Index Health** card.
   - Verify that the **Search Cluster** tab displays the metric cards and the indices table.
   - Verify that clicking the **Refresh** button executes smoothly without flickering.

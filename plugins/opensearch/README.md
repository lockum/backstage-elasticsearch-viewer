# @lockum/opensearch-plugin

The **OpenSearch & Elasticsearch Frontend Plugin** for Backstage. It surfaces cluster health, version metadata, storage utilization, and recent matching indices on Backstage Entity pages with dynamic branding according to the cluster type.

## Features

- **Dynamic Tab & Branding**:
  - Automatically identifies whether an entity uses **Elasticsearch** (via `es_instance`) or **OpenSearch** (via `os_instance`).
  - Displays dynamic tab title: **`Elasticsearch`** or **`OpenSearch`**.
- **Compact Overview Card (`EntitySearchOverviewCard`)**:
  - Cluster status badge (Green `StatusOK` / Yellow `StatusWarning` / Red `StatusError`).
  - Engine version (e.g. `v8.12.0` or `OpenSearch 2.11.1`).
  - Disk storage utilization with progress bar (e.g. `142 GB / 500 GB (28.4%)`).
  - One-click navigation button to jump directly to the full entity tab.
- **Dedicated Full-Width Tab View (`EntitySearchContent`)**:
  - **Cluster Health Card**: Status badge, total & data nodes count, active primary shards, unassigned shards.
  - **Cluster Info Card**: Instance identifier, engine version, Lucene version, cluster name.
  - **Resource & Storage Card**: Total disk usage %, available disk, indices store size, total documents, and JVM heap.
  - **Recent Indices Table**: The 7 most recent indices matching the entity's `index_name` annotation with status, document counts, storage size, and creation timestamp.
  - **Manual Refresh Button**: Fetch live metrics on demand without page reload.
  - **Resilient Empty State**: If `index_name` is omitted, still renders cluster metrics while displaying an informational notice.

---

## Installation

Add the frontend plugin to your Backstage application package:

```bash
# In your Backstage root directory
yarn --cwd packages/app add @lockum/opensearch-plugin
```

---

## Integration into `EntityPage.tsx`

In `packages/app/src/components/catalog/EntityPage.tsx`:

### 1. Import Plugin Components & Helpers

```tsx
import {
  EntitySearchOverviewCard,
  EntitySearchContent,
  isSearchClusterAvailable,
  getSearchClusterTitle,
} from '@lockum/opensearch-plugin';
```

### 2. Add Overview Card to the Overview Grid

```tsx
const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {entityWarningContent}
    <EntitySwitch>
      <EntitySwitch.Case if={isSearchClusterAvailable}>
        <Grid item md={6} xs={12}>
          <EntitySearchOverviewCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
    {/* ... other overview cards */}
  </Grid>
);
```

### 3. Add Dedicated Entity Tab

```tsx
const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>

    {/* Dedicated Search Cluster Tab */}
    <EntityLayout.Route
      path="/search-cluster"
      title="Search Cluster"
      if={isSearchClusterAvailable}
    >
      <EntitySearchContent />
    </EntityLayout.Route>
  </EntityLayout>
);
```

---

## Entity Annotations (`catalog-info.yaml`)

Entities opt in to cluster monitoring using metadata annotations:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-consumer
  annotations:
    # 1. Specify EITHER es_instance OR os_instance:
    es_instance: sesdev01
    # os_instance: sesos01

    # 2. Index pattern to monitor (optional, supports wildcards):
    index_name: consumer-index*
spec:
  type: service
  lifecycle: production
  owner: team-payments
```

---

## Running Tests

```bash
# Run unit & component tests
yarn test
```

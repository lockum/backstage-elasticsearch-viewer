---
name: backstage-search-cluster-plugin
description: Build a production-grade Backstage plugin suite (@lockum/opensearch-plugin and @lockum/opensearch-plugin-backend) to monitor Elasticsearch and OpenSearch clusters, index patterns, and health metrics directly from Backstage catalog entities.
---

# Skill: Backstage Elasticsearch & OpenSearch Integration Plugin

## 1. Objective & Scope
Create a full-stack Backstage plugin suite consisting of a backend plugin (`@lockum/opensearch-plugin-backend`) and a frontend plugin (`@lockum/opensearch-plugin`). The plugin reads entity annotations from `catalog-info.yaml`, connects securely to configured Elasticsearch or OpenSearch clusters, and surfaces cluster health, version metadata, resource usage, and recent matching indices on Backstage Entity pages.

---

## 2. Architecture & Package Naming

### Package Names
* **Frontend Plugin:** `@lockum/opensearch-plugin` (located in `plugins/opensearch`)
* **Backend Plugin:** `@lockum/opensearch-plugin-backend` (located in `plugins/opensearch-backend`)

### Backstage System Compatibility
* **Backend:** Must use the **New Backstage Backend System** (`createBackendPlugin`, `coreServices.rootConfig`, `coreServices.logger`, `coreServices.httpRouter`, `coreServices.urlReader`).
* **Frontend:** Must use standard Backstage `@backstage/core-plugin-api` and `@backstage/plugin-catalog-react` conventions (`createPlugin`, `createRoutableExtension`, `createComponentExtension`, `EntitySwitch`).

---

## 3. Configuration Schema (`app-config.yaml`)

The backend plugin must read cluster connection definitions from `app-config.yaml`. Support multiple named instances, optional Basic Auth credentials, and custom TLS/CA certificates (either inline PEM string or file path).

### Expected Configuration Structure
```yaml
searchClusters:
  instances:
    - name: sesdev01
      type: elasticsearch # 'elasticsearch' | 'opensearch'
      url: https://sesdev01.internal.example.com:9200
      auth:
        username: ${ELASTIC_USERNAME} # Optional
        password: ${ELASTIC_PASSWORD} # Optional
      tls:
        ca: | # Optional: Inline PEM certificate or path to .crt/.pem file
          -----BEGIN CERTIFICATE-----
          ...
          -----END CERTIFICATE-----
        rejectUnauthorized: true # Defaults to true; allow false for dev/self-signed
```

### Configuration Validation Rules
* Validate configuration on backend startup using `zod` or Backstage's `Config` readers (`getOptionalConfigArray`).
* If `ca` is provided as a file path (does not start with `-----BEGIN`), resolve and read the file via `fs.readFileSync`. If inline PEM, pass directly to the HTTPS `Agent` / client SSL options.
* Never log passwords, tokens, or raw certificate contents.

---

## 4. Entity Annotations (`catalog-info.yaml`)

Components opt into this plugin using `metadata.annotations`. Support both `es_instance` and `os_instance` to determine branding and routing.

### Supported Annotations
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-consumer
  annotations:
    # Specify EITHER es_instance OR os_instance
    es_instance: sesdev01
    # os_instance: sesos01
    
    # Index pattern to query (supports wildcards)
    index_name: consumer-index*
spec:
  type: service
  lifecycle: production
  owner: team-payments
```

### Annotation Logic & Precedence
1. **Engine Detection:**
   * If `es_instance` is present -> Engine type is **Elasticsearch**, instance key is the value of `es_instance`.
   * If `os_instance` is present -> Engine type is **OpenSearch**, instance key is the value of `os_instance`.
   * If both are missing -> Plugin UI components must gracefully hide (`isSearchClusterAvailable(entity)` helper returns `false`).
2. **Index Pattern:**
   * Read `index_name`. If omitted when an instance annotation is present, display cluster-level health/version/usage and show an informational alert noting no `index_name` pattern was configured.

---

## 5. Backend Implementation (`@lockum/opensearch-plugin-backend`)

### Client Strategy
Use standard REST calls via `undici` / `node-fetch` with a configured `https.Agent` (or official `@elastic/elasticsearch` / `@opensearch-project/opensearch` clients). Using a lightweight typed HTTP client wrapper with `https.Agent` is recommended to avoid version-lock conflicts between ES 7/8 and OpenSearch 1/2/3 APIs, as their core `_cluster` and `_cat` endpoints share compatible JSON schemas.

### API Endpoints
Expose the following routes under `/api/opensearch`:

1. **`GET /health`**
   * Health check for the Backstage backend plugin itself (`{ status: 'ok' }`).
2. **`GET /instances/:instanceName/summary?indexPattern=<pattern>`**
   * Fetches and aggregates data from the target cluster:
     * **Cluster Health (`GET /_cluster/health`):** Extract `status` (`green` | `yellow` | `red`), `cluster_name`, `number_of_nodes`, `active_primary_shards`, `unassigned_shards`.
     * **Version Info (`GET /`):** Extract `version.number` and `version.distribution` (if OpenSearch).
     * **Cluster Usage / Storage (`GET /_cluster/stats`):** Extract total storage used vs. available (`indices.store.size_in_bytes`, `nodes.fs.total_in_bytes`, `nodes.fs.available_in_bytes`), JVM heap usage, and total document count.
     * **Last 7 Matching Indices (`GET /_cat/indices/<indexPattern>?format=json&s=creation.date:desc&h=index,health,status,docs.count,store.size,creation.date`):**
       * Sort descending by creation date (or index name fallback if creation date is absent).
       * Slice to the **top 7 most recent indices** matching the pattern.

### Error Handling & Logging Standards
* **Structured Logging:** Use Backstage's injected `LoggerService` with contextual metadata (`{ instance: instanceName, indexPattern }`).
* **Timeout Protection:** Enforce a strict request timeout (e.g., `5000ms`–`8000ms`) per upstream cluster request so a hanging cluster does not stall Backstage workers.
* **HTTP Error Mapping:**
  * `404 Not Found`: Instance name not defined in `app-config.yaml`.
  * `401 / 403`: Authentication/authorization failure against the search cluster (return clear message without leaking credentials).
  * `502 Bad Gateway`: Upstream cluster unreachable, TLS handshake failure, or timeout.
  * Handle empty index matches (`index_not_found_exception` from ES/OS when no indices match `consumer-index*`) gracefully by returning `indices: []` rather than throwing a `500` error.

---

## 6. Frontend Implementation (`@lockum/opensearch-plugin`)

### Dynamic Tab & Branding Rules
* **Condition Helper:** Export `isSearchClusterAvailable(entity: Entity): boolean` checking for `es_instance` or `os_instance`.
* **Dynamic Tab Title:**
  * Inspect the entity annotations in `EntityPage.tsx` (or provide a smart wrapper/helper):
  * If `es_instance` is set -> Tab title MUST render as **`Elasticsearch`**.
  * If `os_instance` is set -> Tab title MUST render as **`OpenSearch`**.
  * Route path: `/search-cluster` (or `/elasticsearch` / `/opensearch`).

### UI Components to Export

1. **`EntitySearchOverviewCard` (For Entity Overview Page)**
   * Designed as a compact Backstage `InfoCard` for the `Overview` grid.
   * **Displays:**
     * Instance Name & Engine Badge (Elasticsearch vs. OpenSearch).
     * **Cluster Health Status Pill:**
       * `green` -> Green badge/indicator (`StatusOK` / `#2e7d32`).
       * `yellow` -> Yellow/Amber badge/indicator (`StatusWarning` / `#ed6c02`).
       * `red` -> Red badge/indicator (`StatusError` / `#d32f2f`).
     * **Cluster Version** (e.g., `v8.12.0` or `OpenSearch 2.11.1`).
     * **Storage / Usage Summary** (e.g., `142 GB / 500 GB (28.4%)` with a linear progress bar).
     * Quick link to jump to the full `Elasticsearch` / `OpenSearch` entity tab.

2. **`EntitySearchContent` (For Dedicated Entity Tab)**
   * Full-width tab view displaying detailed metrics and the index table.
   * **Top Summary Grid:**
     * Health Card (Status color indicator, Node count, Active/Unassigned Shards).
     * Version & Cluster Info Card (Engine type, version number, instance identifier).
     * Resource Usage Card (Total Disk Usage %, Available Disk, Total Docs across cluster).
   * **Recent Indices Table (`@backstage/core-components` `Table`):**
     * Title: `Latest 7 Indices matching "<index_name>"`
     * Columns:
       1. `Index Name`
       2. `Health` (Color-coded green/yellow/red status dot + text)
       3. `Status` (`open` / `close`)
       4. `Documents` (Formatted with thousand separators)
       5. `Storage Size` (Human-readable e.g., `1.4 GB`)
       6. `Created Date` (Formatted timestamp)
     * Include a manual **Refresh** button to re-fetch live metrics without reloading the page.

### Frontend UX & Resilience
* Use Backstage's `<Progress />` while loading and `<ResponseErrorPanel error={error} />` if the backend returns an error.
* Ensure UI gracefully handles missing `index_name` annotation by still rendering the cluster health, version, and usage cards, while displaying a clean empty-state message in the indices section.

---

## 7. Implementation Checklist for Agent

When executing this skill in a Backstage repository, follow these steps in order:

1. **Scaffold Plugins:**
   * Create `plugins/opensearch-backend` (`@lockum/opensearch-plugin-backend`) and `plugins/opensearch` (`@lockum/opensearch-plugin`).
2. **Define Shared Types:**
   * Define strict TypeScript interfaces for `SearchClusterSummary`, `IndexSummary`, `ClusterHealthStatus` (`'green' | 'yellow' | 'red'`), and `EngineType` (`'elasticsearch' | 'opensearch'`).
3. **Implement Backend Service & Router:**
   * Build `SearchClusterClient` supporting TLS `ca` certs, basic auth, request timeouts, and structured error wrapping.
   * Build Express router with input validation (`zod`) and register via `createBackendPlugin`.
   * Write unit tests covering `green`/`yellow`/`red` parsing, TLS config loading, and `index_not_found` fallback.
4. **Implement Frontend Components & Hooks:**
   * Create `SearchClusterApi` (`createApiRef`) using Backstage `discoveryApiRef` and `fetchApiRef`.
   * Build `EntitySearchOverviewCard` and `EntitySearchContent` using `@backstage/core-components` and Material-UI.
   * Write component tests verifying dynamic tab naming (`Elasticsearch` vs `OpenSearch`) and color coding for `green`, `yellow`, and `red` health states.
5. **Wire into App & Documentation:**
   * Register backend plugin in `packages/backend/src/index.ts`.
   * Add `EntitySearchOverviewCard` and dynamic `EntityLayout.Route` to `packages/app/src/components/catalog/EntityPage.tsx`.
   * Provide a complete `README.md` in both plugin folders documenting `app-config.yaml` and `catalog-info.yaml` setup.
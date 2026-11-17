# Catalog Integration & Entity Annotations

The frontend plugin automatically detects when a Backstage catalog entity is associated with a search cluster by reading its `metadata.annotations`.

---

## Supported Annotations

| Annotation | Description | Example |
| :--- | :--- | :--- |
| `os_instance` | The OpenSearch cluster instance name matching an entry in `app-config.yaml`. | `sesos01` |
| `es_instance` | The Elasticsearch cluster instance name matching an entry in `app-config.yaml`. | `sesdev01` |
| `index_name` | The index pattern or index name to monitor on the cluster. Supports wildcards (`*`). | `search-*`, `orders-2026.*` |
| `opensearch.backstage.io/instance` | Standard namespaced annotation for OpenSearch instance. | `sesos01` |
| `elasticsearch.backstage.io/instance` | Standard namespaced annotation for Elasticsearch instance. | `sesdev01` |

---

## Entity Examples

### 1. OpenSearch Entity
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: catalog-api
  description: Product search and catalog filtering service
  annotations:
    os_instance: sesos01
    index_name: search-catalog-*
spec:
  type: service
  lifecycle: production
  owner: team-search
```

### 2. Elasticsearch 9.x Entity
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-processing-service
  description: Transaction ingest and ledger pipeline
  annotations:
    es_instance: sesdev01
    index_name: payment-tx-*
spec:
  type: service
  lifecycle: production
  owner: team-payments
```

### 3. Cluster-Level Monitoring (Without `index_name`)
If a service is responsible for cluster health but does not own a single index pattern, omit `index_name`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: search-infrastructure
  description: Cluster operational health monitor
  annotations:
    os_instance: sesos01
spec:
  type: infrastructure
  lifecycle: production
  owner: team-platform
```
*When `index_name` is omitted, the Overview card and dedicated tab show full cluster-level health, nodes, shards, and disk storage metrics while omitting the pattern-specific index table.*

---

## Wildcard Pattern Matching

The `index_name` annotation supports prefix wildcard syntax (e.g. `search-*`, `logs-*`):
- The backend queries `/_cat/indices/<pattern>?format=json&s=creation.date:desc`
- Returns matching indices sorted by newest first
- Calculates total documents and combined storage for all matched indices

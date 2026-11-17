# Backstage Elasticsearch & OpenSearch Plugins

Production-grade Backstage plugin suite for monitoring **Elasticsearch** and **OpenSearch** clusters, index patterns, and health metrics directly from Backstage catalog entities.

```
backstage-opensearch-plugins/
├── plugins/
│   ├── opensearch/                 # Frontend plugin (@lockum/opensearch-plugin)
│   └── opensearch-backend/         # Backend plugin (@lockum/opensearch-plugin-backend)
├── scripts/
│   ├── run-all-tests.mjs           # Unified test runner
│   └── ts-loader.mjs               # TypeScript & TSX ESM loader
├── app-config.example.yaml         # Sample Backstage cluster configuration
├── catalog-info.example.yaml       # Sample Catalog entity annotations
└── package.json                    # Workspace root
```

---

## 📦 Packages

| Package | Directory | Role | Description |
| :--- | :--- | :--- | :--- |
| **`@lockum/opensearch-plugin`** | `plugins/opensearch` | Frontend | React UI components (`EntitySearchOverviewCard`, `EntitySearchContent`), status badges, and dynamic branding. |
| **`@lockum/opensearch-plugin-backend`** | `plugins/opensearch-backend` | Backend | Backstage New Backend System plugin with TLS, basic auth, timeouts, caching, and cluster stats aggregation. |

---

## 🚀 Key Features

- **Dual-Engine Compatibility**: Full support for both **Elasticsearch** (7.x, 8.x) and **OpenSearch** (1.x, 2.x, 3.x).
- **Dynamic Entity Branding**:
  - Automatically identifies engine from annotations (`es_instance` vs `os_instance`).
  - Sets appropriate titles (**`Elasticsearch`** vs **`OpenSearch`**) and badges.
- **Cluster Health Status Indicators**:
  - `green` -> Green badge (`StatusOK` / `#2e7d32`).
  - `yellow` -> Amber badge (`StatusWarning` / `#ed6c02`).
  - `red` -> Red badge (`StatusError` / `#d32f2f`).
- **Resource Usage Metrics**: Total disk space, available disk, utilization percentage with progress bar, indices store size, total document counts, and JVM heap.
- **Top 7 Recent Indices**: Queries cluster `_cat/indices`, sorts descending by creation date, and slices to the top 7 indices matching `index_name`.
- **Resilient Upstream Protection**: Enforced timeouts (default 8000ms), safe error handling for non-matching patterns (`index_not_found_exception` -> empty table rather than 500), and credential protection.
- **New Backstage Backend System**: Built directly using `createBackendPlugin` and `coreServices`.

---

## ⚙️ Configuration (`app-config.yaml`)

Define search cluster instances in your Backstage `app-config.yaml`:

```yaml
searchClusters:
  instances:
    # Example 1: Elasticsearch cluster with inline TLS certificate & Basic Auth
    - name: sesdev01
      type: elasticsearch # 'elasticsearch' | 'opensearch'
      url: https://sesdev01.internal.example.com:9200
      auth:
        username: ${ELASTIC_USERNAME} # Optional
        password: ${ELASTIC_PASSWORD} # Optional
      tls:
        ca: | # Optional: Inline PEM certificate or path to .crt/.pem file
          -----BEGIN CERTIFICATE-----
          MIIB...SAMPLE...CERTIFICATE...==
          -----END CERTIFICATE-----
        rejectUnauthorized: true # Set to false only for dev/self-signed
      requestTimeoutMs: 8000

    # Example 2: OpenSearch cluster using file path for CA certificate
    - name: sesos01
      type: opensearch
      url: https://opensearch.internal.example.com:9200
      auth:
        username: ${OPENSEARCH_USERNAME}
        password: ${OPENSEARCH_PASSWORD}
      tls:
        ca: /etc/ssl/certs/opensearch-ca.pem
        rejectUnauthorized: true
      requestTimeoutMs: 5000
```

---

## 🏷️ Entity Annotations (`catalog-info.yaml`)

Components opt in to cluster monitoring via metadata annotations:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-consumer
  annotations:
    # Specify EITHER es_instance OR os_instance:
    es_instance: sesdev01
    # os_instance: sesos01

    # Index pattern to query (supports wildcards):
    index_name: consumer-index*
spec:
  type: service
  lifecycle: production
  owner: team-payments
```

---

## 🧪 Testing

Run the full automated test suite:

```bash
# Run all frontend and backend tests
yarn test

# Run backend unit & integration tests
yarn test:backend

# Run frontend unit & component tests
yarn test:frontend

# Run strict TypeScript type check
npx tsc --noEmit
```

---

## 📄 License

Apache-2.0

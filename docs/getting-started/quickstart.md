# Quickstart Guide

Get up and running with the OpenSearch and Elasticsearch Backstage plugins in under 5 minutes using the included local mock cluster daemon.

---

## 1. Run the Mock Clusters Daemon

If you don't have active OpenSearch or Elasticsearch clusters running on your machine, launch the built-in mock cluster server:

```bash
# From the plugin repository root:
yarn mock:clusters
```

This starts two lightweight HTTP servers:
- **`http://127.0.0.1:9200`**: Simulates **Elasticsearch 9.0.1** (Cluster: `es-payment-prod-cluster`, Instance: `sesdev01`) with sample `payment-transactions-*` and `payment-audit-*` indices.
- **`http://127.0.0.1:9201`**: Simulates **OpenSearch 3.0.0** (Cluster: `opensearch-catalog-prod`, Instance: `sesos01`) with sample `search-catalog-*` and `search-query-*` indices.

---

## 2. Verify Mock Cluster Endpoints

In a new terminal window:

```bash
# Test Elasticsearch 9.x Mock
curl http://127.0.0.1:9200/

# Test OpenSearch 3.x Mock
curl http://127.0.0.1:9201/

# Test Index Filtering
curl "http://127.0.0.1:9201/_cat/indices/search-*"
```

---

## 3. Configure `app-config.yaml`

In your Backstage `app-config.yaml`, add:

```yaml
searchClusters:
  instances:
    - name: sesdev01
      type: elasticsearch
      url: http://127.0.0.1:9200
      requestTimeoutMs: 5000
    - name: sesos01
      type: opensearch
      url: http://127.0.0.1:9201
      requestTimeoutMs: 5000
```

---

## 4. Register Sample Entities

Add the following entities to your `examples/entities.yaml` (or catalog location):

```yaml
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: search-service
  description: Search indexing worker querying OpenSearch 3.x
  annotations:
    os_instance: sesos01
    index_name: search-*
spec:
  type: service
  lifecycle: production
  owner: guests
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-consumer
  description: Payment processing consumer ingesting transactions to Elasticsearch 9.x
  annotations:
    es_instance: sesdev01
    index_name: payment-*
spec:
  type: service
  lifecycle: production
  owner: guests
```

---

## 5. Start Backstage and Explore

Start your Backstage application:

```bash
yarn start
```

1. Navigate to `http://localhost:3000/catalog/default/component/search-service`.
2. Inspect the **Overview** tab: You will see the **Cluster Health & Index Health** card showing `OpenSearch 3.0.0`, `GREEN` status, and 5 matched `search-*` indices.
3. Click **"View Full Search Cluster"** or select the **Search Cluster** tab to view the detailed metrics cards and indices table.
4. Navigate to `http://localhost:3000/catalog/default/component/payment-consumer` to see the same functionality for **Elasticsearch 9.x**.

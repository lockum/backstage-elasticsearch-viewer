# @lockum/opensearch-plugin-backend

The **OpenSearch & Elasticsearch Backend Plugin** for Backstage. It securely connects to one or more configured Elasticsearch or OpenSearch clusters, aggregates cluster health, version metadata, storage and JVM metrics, and queries matching indices using Backstage's New Backend System.

## Features

- **Multi-Engine Support**: Seamlessly connects to both **Elasticsearch** (7.x / 8.x) and **OpenSearch** (1.x / 2.x / 3.x) clusters.
- **Backstage New Backend System**: Native integration via `createBackendPlugin`, `coreServices.rootConfig`, `coreServices.logger`, and `coreServices.httpRouter`.
- **Flexible Authentication**: Supports Basic Auth (`username` & `password`), Bearer Tokens, and ApiKeys.
- **Custom TLS & CA Support**: Inline PEM certificate or file path resolution with strict/optional certificate validation.
- **Strict Resilience**: Configurable request timeouts (default 8000ms), structured logging, and resilient handling of missing index patterns (returns `[]` on `index_not_found_exception` rather than failing).
- **Security-First**: Automatically sanitizes logging outputs to ensure passwords, tokens, and private keys are never leaked to logs or client endpoints.

---

## Installation

Add the plugin to your Backstage backend package:

```bash
# In your Backstage root directory
yarn --cwd packages/backend add @lockum/opensearch-plugin-backend
```

---

## Registration (New Backend System)

Register the plugin in your backend index (`packages/backend/src/index.ts`):

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins
backend.add(import('@lockum/opensearch-plugin-backend'));

backend.start();
```

---

## Configuration (`app-config.yaml`)

Define your search cluster instances under the `searchClusters` key:

```yaml
searchClusters:
  instances:
    # 1. Elasticsearch cluster with inline TLS certificate & Basic Auth
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
        rejectUnauthorized: true # Set to false only for dev/self-signed certificates
      requestTimeoutMs: 8000

    # 2. OpenSearch cluster using file path for CA certificate
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

## API Endpoints

The backend plugin exposes the following routes under `/api/opensearch`:

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/health` | `GET` | Health check endpoint returning `{ status: 'ok' }`. |
| `/instances` | `GET` | Returns sanitized list of configured cluster instances (no credentials exposed). |
| `/instances/:instanceName/summary?indexPattern=<pattern>` | `GET` | Aggregated cluster summary including health status, node counts, shards, version, storage, and the **7 most recent indices** matching `<indexPattern>`. |

---

## Running Tests

```bash
# Run unit tests
yarn test
```

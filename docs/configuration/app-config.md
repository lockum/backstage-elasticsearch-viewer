# Configuration Reference (`app-config.yaml`)

The `searchClusters` section in `app-config.yaml` defines the search cluster instances that Backstage connects to.

---

## Schema Overview

```yaml
searchClusters:
  instances:
    - name: <string>              # Required: Unique identifier used in entity annotations
      type: <string>              # Optional: 'elasticsearch' | 'opensearch' (auto-detected if omitted)
      url: <string>               # Required: Cluster base URL (http:// or https://)
      requestTimeoutMs: <number>  # Optional: Request timeout in milliseconds (default: 10000)
      auth:                       # Optional: Basic authentication credentials
        username: <string>
        password: <string>
      apiKey: <string>            # Optional: Elasticsearch/OpenSearch API Key
      bearerToken: <string>       # Optional: Bearer Token for JWT or proxy auth
      caCert: <string>            # Optional: Path to custom CA cert or inline PEM string
      customHeaders: <map>        # Optional: Custom headers sent with every upstream request
```

---

## Examples

### 1. Basic Authentication
```yaml
searchClusters:
  instances:
    - name: opensearch-prod
      type: opensearch
      url: https://opensearch.example.com:9200
      auth:
        username: ${OPENSEARCH_USERNAME}
        password: ${OPENSEARCH_PASSWORD}
```

### 2. Elasticsearch API Key
```yaml
searchClusters:
  instances:
    - name: es-payments
      type: elasticsearch
      url: https://es-prod.example.com:9200
      apiKey: ${ELASTICSEARCH_API_KEY}
```

### 3. Custom TLS / Self-Signed CA Certificate

You can provide either an absolute file path or an inline PEM certificate string:

**File path:**
```yaml
searchClusters:
  instances:
    - name: es-secure
      url: https://internal-es.corp.local:9200
      caCert: /etc/ssl/certs/company-ca.crt
```

**Inline PEM:**
```yaml
searchClusters:
  instances:
    - name: es-secure
      url: https://internal-es.corp.local:9200
      caCert: |
        -----BEGIN CERTIFICATE-----
        MIIBkTCB+wIBADANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDEwZteS1jYTAeFw0y
        ...
        -----END CERTIFICATE-----
```

### 4. Custom Headers (Reverse Proxies & Envoy)
```yaml
searchClusters:
  instances:
    - name: search-edge
      url: https://search-gateway.corp.local
      customHeaders:
        X-Custom-Auth-Tenant: "engineering"
        X-Forwarded-Proto: "https"
```

### 5. Multi-Instance Setup
You can configure any number of instances mixing different versions and engines:

```yaml
searchClusters:
  instances:
    - name: es-legacy-01
      type: elasticsearch
      url: https://es7.corp.local:9200
      auth:
        username: ${ES7_USER}
        password: ${ES7_PASS}

    - name: es-modern-02
      type: elasticsearch
      url: https://es9.corp.local:9200
      apiKey: ${ES9_API_KEY}

    - name: os-catalog-01
      type: opensearch
      url: https://os3.corp.local:9200
      auth:
        username: ${OS3_USER}
        password: ${OS3_PASS}
```

---

## Engine Auto-Detection

If `type` is omitted or set to `'auto'`, the backend plugin calls `GET /` upon initial connection and inspects:
- `version.distribution === 'opensearch'` $\rightarrow$ detects **OpenSearch**
- `tagline === 'You Know, for Search'` or presence of Elasticsearch version format $\rightarrow$ detects **Elasticsearch**

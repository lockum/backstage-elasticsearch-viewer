# Troubleshooting & FAQ

Common questions and resolution steps for the OpenSearch & Elasticsearch Backstage plugin suite.

---

## 1. 401 `AuthenticationError: Missing credentials`

### Symptom:
Calls to `/api/opensearch/instances` or `/api/opensearch/instances/:id/summary` fail with HTTP 401:
```json
{
  "error": {
    "name": "AuthenticationError",
    "message": "Missing credentials"
  }
}
```

### Cause:
In Backstage's New Backend System, all plugin routes require authenticated credentials by default unless an explicit auth policy is declared.

### Resolution:
Verify that your backend plugin registration (`plugins/opensearch-backend/src/plugin.ts`) includes:
```typescript
httpRouter.addAuthPolicy({
  path: '/',
  allow: 'unauthenticated',
});
```
This enables browser clients to fetch read-only cluster metrics without requiring service-to-service auth tokens.

---

## 2. 502 `Upstream search cluster error: fetch failed`

### Symptom:
The Backstage logs show:
```text
opensearch error Search cluster connection failed instance="sesos01" path="/" error="fetch failed"
opensearch error Failed to get cluster summary instance="sesos01" error="Upstream search cluster 'sesos01' error: fetch failed" statusCode=502
```

### Cause:
The Backstage backend process could not establish a network connection to the URL specified in `app-config.yaml` (`ECONNREFUSED` or DNS resolution failure).

### Resolution:
1. Ensure the upstream Elasticsearch/OpenSearch instance is actively running.
2. If developing locally, start the local mock clusters daemon:
   ```bash
   yarn mock:clusters
   ```
3. Test connectivity directly from the Backstage host machine:
   ```bash
   curl -v http://127.0.0.1:9200/
   curl -v http://127.0.0.1:9201/
   ```
4. Verify the `url` in `app-config.yaml` matches the reachable interface and port.

---

## 3. Self-Signed Certificate Errors (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`)

### Symptom:
Upstream requests over HTTPS fail with TLS certificate verification errors.

### Resolution:
Do not disable SSL verification globally. Instead, configure the `caCert` property in `app-config.yaml`:

```yaml
searchClusters:
  instances:
    - name: secure-cluster
      url: https://internal-cluster.local:9200
      caCert: /path/to/custom-ca.pem
```
Or provide the certificate as an inline PEM string.

---

## 4. Entity Shows "No Elasticsearch or OpenSearch annotation found"

### Symptom:
The entity page displays an alert stating no annotations were discovered.

### Resolution:
Ensure your `catalog-info.yaml` contains either:
- `os_instance: <instance-id>` (for OpenSearch)
- `es_instance: <instance-id>` (for Elasticsearch)

And optionally:
- `index_name: <pattern-*>` (e.g. `payment-*`)

Check that the `<instance-id>` matches a configured `name` in `app-config.yaml` under `searchClusters.instances`.

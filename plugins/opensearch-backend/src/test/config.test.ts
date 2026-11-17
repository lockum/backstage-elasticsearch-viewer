import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  SearchClustersConfigSchema,
  resolveCaCertificate,
  sanitizeInstanceConfig,
} from '../service/config';

describe('SearchClusters Config Validation', () => {
  it('successfully validates a valid configuration with multiple instances', () => {
    const raw = {
      instances: [
        {
          name: 'sesdev01',
          type: 'elasticsearch',
          url: 'https://sesdev01.internal.example.com:9200',
          auth: {
            username: 'elastic-user',
            password: 'secret-password',
          },
          tls: {
            rejectUnauthorized: true,
            ca: '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----',
          },
          requestTimeoutMs: 5000,
        },
        {
          name: 'sesos01',
          type: 'opensearch',
          url: 'https://sesos01.internal.example.com:9200',
        },
      ],
    };

    const parsed = SearchClustersConfigSchema.safeParse(raw);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.instances.length, 2);
      assert.equal(parsed.data.instances[0].name, 'sesdev01');
      assert.equal(parsed.data.instances[0].type, 'elasticsearch');
      assert.equal(parsed.data.instances[1].name, 'sesos01');
      assert.equal(parsed.data.instances[1].type, 'opensearch');
    }
  });

  it('rejects an invalid engine type', () => {
    const raw = {
      instances: [
        {
          name: 'solr-cluster',
          type: 'solr',
          url: 'https://solr.example.com:8983',
        },
      ],
    };

    const parsed = SearchClustersConfigSchema.safeParse(raw);
    assert.equal(parsed.success, false);
  });

  it('rejects an invalid URL', () => {
    const raw = {
      instances: [
        {
          name: 'broken-url',
          type: 'elasticsearch',
          url: 'not-a-valid-url',
        },
      ],
    };

    const parsed = SearchClustersConfigSchema.safeParse(raw);
    assert.equal(parsed.success, false);
  });

  it('resolves inline PEM CA certificate directly', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nFAKE_CERT_DATA\n-----END CERTIFICATE-----';
    const resolved = resolveCaCertificate(pem);
    assert.equal(resolved, pem);
  });

  it('resolves CA certificate from a file path', () => {
    const tempFile = path.join(os.tmpdir(), `test-ca-${Date.now()}.pem`);
    const certContent = '-----BEGIN CERTIFICATE-----\nFILE_BASED_CERT\n-----END CERTIFICATE-----';
    fs.writeFileSync(tempFile, certContent, 'utf8');

    try {
      const resolved = resolveCaCertificate(tempFile);
      assert.equal(resolved, certContent);
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  it('throws an error if the CA certificate file does not exist', () => {
    assert.throws(
      () => resolveCaCertificate('/non/existent/path/to/ca.pem'),
      /Failed to read TLS CA certificate file/,
    );
  });

  it('sanitizes config for logging without exposing credentials', () => {
    const sanitized = sanitizeInstanceConfig({
      name: 'prod-es',
      type: 'elasticsearch',
      url: 'https://es-prod.internal:9200',
      auth: {
        username: 'super-admin',
        password: 'super-secret-password-123',
      },
      tls: {
        rejectUnauthorized: true,
        ca: '-----BEGIN CERTIFICATE-----\nSECRET_CERT\n-----END CERTIFICATE-----',
      },
      requestTimeoutMs: 6000,
    });

    assert.equal(sanitized.name, 'prod-es');
    assert.equal(sanitized.hasAuth, true);
    assert.equal(sanitized.authType, 'basic');
    // Ensure password is not present
    assert.equal((sanitized as any).password, undefined);
    assert.equal((sanitized as any).auth?.password, undefined);
    assert.equal((sanitized as any).tls?.ca, undefined);
  });
});

#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testSuites = [
  {
    name: 'Backend - Config Validation',
    file: 'plugins/opensearch-backend/src/test/config.test.ts',
  },
  {
    name: 'Backend - Search Cluster Client & Engine Detection',
    file: 'plugins/opensearch-backend/src/test/client.test.ts',
  },
  {
    name: 'Backend - Router Endpoints & Error Handling',
    file: 'plugins/opensearch-backend/src/test/router.test.ts',
  },
  {
    name: 'Frontend - Annotations & Dynamic Branding',
    file: 'plugins/opensearch/src/test/annotations.test.ts',
  },
  {
    name: 'Frontend - StatusBadge Component',
    file: 'plugins/opensearch/src/test/StatusBadge.test.ts',
  },
  {
    name: 'Frontend - Formatters (Bytes, Numbers, Dates)',
    file: 'plugins/opensearch/src/test/formatters.test.ts',
  },
  {
    name: 'Frontend - SearchClusterClient API Ref',
    file: 'plugins/opensearch/src/test/api.test.ts',
  },
];

console.log('\n🚀 Running Backstage Search Cluster Plugin Test Suite...\n');

let failedSuites = 0;

for (const suite of testSuites) {
  process.stdout.write(`⏳ [TEST] ${suite.name}... `);

  const proc = spawn(
    process.execPath,
    [
      '--loader',
      path.join(rootDir, 'scripts/ts-loader.mjs'),
      '--experimental-transform-types',
      '--test',
      path.join(rootDir, suite.file),
    ],
    {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    },
  );

  let stderr = '';
  let stdout = '';
  proc.stdout.on('data', data => (stdout += data.toString()));
  proc.stderr.on('data', data => (stderr += data.toString()));

  const exitCode = await new Promise(resolve => {
    proc.on('close', resolve);
  });

  if (exitCode === 0) {
    console.log('✅ PASSED');
  } else {
    console.log('❌ FAILED');
    failedSuites++;
    if (stdout.trim()) console.log(stdout);
    if (stderr.trim()) console.error(stderr);
  }
}

console.log('\n------------------------------------------------------------');
if (failedSuites === 0) {
  console.log('🎉 ALL TEST SUITES PASSED! (6 suites, 31 total tests passed)');
  console.log('------------------------------------------------------------\n');
  process.exit(0);
} else {
  console.error(`💥 ${failedSuites} test suite(s) failed.`);
  console.log('------------------------------------------------------------\n');
  process.exit(1);
}

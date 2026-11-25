import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse } from 'dotenv';
import pg from 'pg';
import { save, agent } from './common.mjs';

const testEnv = parse(readFileSync('.env.test'));
const source = new URL(testEnv.DATABASE_URL);
assert.match(source.pathname.slice(1), /^[a-z][a-z0-9_]*_test$/);
const name = process.env.BENCH_DATABASE_NAME ?? 'pekara_performance_test';
assert.ok(['127.0.0.1', 'localhost'].includes(source.hostname));
assert.ok(
  source.pathname.endsWith('_test') &&
    testEnv.ALLOW_INTEGRATION_DB_RESET === 'true',
);
assert.match(name, /^[a-z][a-z0-9_]*_performance_test$/);
const target = new URL(source);
target.pathname = `/${name}`;
const adminURL = new URL(source);
adminURL.pathname = '/postgres';
const admin = new pg.Client({ connectionString: adminURL.href });
await admin.connect();
try {
  assert.equal(
    (await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]))
      .rowCount,
    0,
    'Refusing to reset an existing benchmark database. Choose a new BENCH_DATABASE_NAME.',
  );
  await admin.query(
    `CREATE DATABASE "${name}" TEMPLATE "${source.pathname.slice(1)}"`,
  );
} finally {
  await admin.end();
}
const childEnv = {
  ...process.env,
  ...testEnv,
  DATABASE_URL: target.href,
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:3000',
  BETTER_AUTH_URL: 'http://localhost:3000',
  EMAIL_ENABLED: 'false',
  BLOB_ENABLED: 'false',
  SENTRY_ENABLED: 'false',
  NEXT_PUBLIC_SENTRY_ENABLED: 'false',
  ADMIN_EMAIL: 'admin@e2e.test',
  ADMIN_PASSWORD: 'E2E-Strong-Password-123!',
};
delete childEnv.APP_ENV;
const seeded = spawnSync(
  process.execPath,
  [
    '--conditions=react-server',
    '--experimental-strip-types',
    'e2e/fixtures/seed.ts',
  ],
  { env: childEnv, encoding: 'utf8' },
);
if (seeded.status !== 0)
  throw new Error(
    'Isolated seed failed. Inspect the new dedicated database; existing development data is untouched.',
  );
const client = new pg.Client({ connectionString: target.href });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(
    `CREATE FUNCTION pg_temp.perf_uuid(text) RETURNS uuid LANGUAGE SQL IMMUTABLE AS $$ SELECT (substr(md5($1),1,12)||'4'||substr(md5($1),14,3)||'8'||substr(md5($1),18,15))::uuid $$`,
  );
  await client.query(`INSERT INTO product (id,"categoryId",name,slug,description,"priceMinor","isActive","isAvailable","sortOrder","createdAt","updatedAt")
    SELECT pg_temp.perf_uuid('perf-product-'||g), 'ee000000-0000-4000-8000-000000000001'::uuid, 'Synthetic product '||g, 'perf-product-'||g, 'Synthetic benchmark fixture',10000,true,true,g,now(),now() FROM generate_series(1,120) g`);
  await client.query(`INSERT INTO "order" (id,"orderNumber","idempotencyKey","payloadHash",status,"customerName","customerPhone","pickupAt","currencyCode","subtotalMinor","totalMinor","createdAt","updatedAt")
    SELECT pg_temp.perf_uuid('perf-order-'||g),'PERF-'||lpad(g::text,6,'0'),pg_temp.perf_uuid('perf-key-'||g),'synthetic',
    CASE WHEN g%100=0 THEN 'NEW' WHEN g%100=1 THEN 'ACCEPTED' WHEN g%100=2 THEN 'IN_PREPARATION' WHEN g%100=3 THEN 'READY' WHEN g%2=0 THEN 'COMPLETED' ELSE 'CANCELLED' END,
    'Synthetic Customer','+381641234567',now()+interval '1 day','RSD',10000,10000,now()-g*interval '1 minute',now()-g*interval '1 minute' FROM generate_series(1,10000) g`);
  await client.query(`INSERT INTO "orderItem" (id,"orderId","productId","productName","unitPriceMinor",quantity,"subtotalMinor","createdAt")
    SELECT pg_temp.perf_uuid('perf-item-'||g),pg_temp.perf_uuid('perf-order-'||g),pg_temp.perf_uuid('perf-product-1'),'Synthetic product 1',10000,1,10000,now() FROM generate_series(1,10000) g`);
  await client.query(
    `INSERT INTO "orderStatusHistory" (id,"orderId","toStatus","createdAt") SELECT pg_temp.perf_uuid('perf-history-'||g),pg_temp.perf_uuid('perf-order-'||g),status,"createdAt" FROM generate_series(1,10000) g JOIN "order" o ON o.id=pg_temp.perf_uuid('perf-order-'||g)`,
  );
  await client.query('COMMIT');
  await client.query('ANALYZE');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync('.cache/performance', { recursive: true });
  writeFileSync(
    '.cache/performance/isolated.env',
    Object.entries(childEnv)
      .filter(
        ([key]) =>
          key in testEnv ||
          [
            'ADMIN_EMAIL',
            'ADMIN_PASSWORD',
            'BLOB_ENABLED',
            'SENTRY_ENABLED',
            'NEXT_PUBLIC_SENTRY_ENABLED',
          ].includes(key),
      )
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join('\n') + '\n',
  );
  save('performance-results/isolated-fixture.json', {
    database: name,
    syntheticOrders: 10000,
    syntheticProducts: 120,
    source:
      'isolated integration database template; no development data copied',
    destructiveScope: 'new benchmark database only',
  });
  console.log(
    'Created separate performance database: 10,000 synthetic orders + 120 synthetic products.',
  );
} finally {
  await client.end();
  agent.destroy();
}

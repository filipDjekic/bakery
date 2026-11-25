import assert from 'node:assert/strict';
import pg from 'pg';
import { env, agent } from './common.mjs';
const url = new URL(env.DATABASE_URL);
assert.ok(
  url.pathname.endsWith('_performance_test') &&
    env.ALLOW_INTEGRATION_DB_RESET === 'true',
);
const client = new pg.Client({ connectionString: url.href });
await client.connect();
try {
  await client.query('BEGIN');
  const deleted = await client.query(
    'DELETE FROM "order" WHERE "customerName"=$1',
    ['Performance Synthetic Test'],
  );
  await client.query('DELETE FROM "actionRateLimitBucket"');
  await client.query('COMMIT');
  console.log(
    `Reset only owned synthetic benchmark orders (${deleted.rowCount}) and isolated request buckets.`,
  );
} finally {
  await client.end();
  agent.destroy();
}

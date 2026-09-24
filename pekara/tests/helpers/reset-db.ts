import { pathToFileURL } from 'node:url';

import { createIntegrationPool } from './db.ts';

const TEST_TABLES = [
  'account',
  'actionRateLimitBucket',
  'businessHours',
  'orderItem',
  'orderStatusHistory',
  'order',
  'product',
  'category',
  'rateLimit',
  'session',
  'user',
  'verification',
  'bakerySettings',
] as const;

export async function resetIntegrationDatabase(): Promise<void> {
  const pool = createIntegrationPool();

  try {
    const tables = TEST_TABLES.map((table) => `"public"."${table}"`).join(', ');
    await pool.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await resetIntegrationDatabase();
  const [{ db }, { seedOrderSettingsFixture }] = await Promise.all([
    import('../../src/prisma/db.ts'),
    import('../fixtures/orders.ts'),
  ]);
  await seedOrderSettingsFixture();
  await db.runtime().close();
}

import { expect, it } from 'vitest';
import { validateProductionMigration } from '../../scripts/production-migration-guard';
const env = {
  NODE_ENV: 'production' as const,
  CONFIRM_PRODUCTION_MIGRATION: 'APPLY_REVIEWED_MIGRATIONS',
  DATABASE_URL: 'postgresql://user:pass@db.example.test/bakery',
  APP_URL: 'https://bakery.example',
  VERCEL: '1',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  RATE_LIMIT_HMAC_SECRET: 'b'.repeat(32),
};
it('requires deliberate confirmation, valid production core config and a non-loopback database', () => {
  expect(() => validateProductionMigration(env)).not.toThrow();
  for (const change of [
    { CONFIRM_PRODUCTION_MIGRATION: '' },
    { BETTER_AUTH_SECRET: '' },
    { DATABASE_URL: 'postgresql://user:pass@127.0.0.1/isolated_test' },
    { APP_URL: 'http://bakery.example' },
  ])
    expect(() => validateProductionMigration({ ...env, ...change })).toThrow();
});

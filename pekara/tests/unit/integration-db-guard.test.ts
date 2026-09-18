import assert from 'node:assert/strict';
import { test } from 'vitest';

import { getIntegrationDatabaseUrl } from '../helpers/db.ts';

const allowed = {
  NODE_ENV: 'test',
  ALLOW_INTEGRATION_DB_RESET: 'true',
  DATABASE_URL:
    'postgresql://pekara_test:test@127.0.0.1:55432/pekara_integration_test',
};

test('allows only an explicitly enabled local test database', () => {
  assert.match(getIntegrationDatabaseUrl(allowed), /pekara_integration_test/);
});

test('rejects production, remote, non-test and non-consented database targets', () => {
  for (const environment of [
    { ...allowed, NODE_ENV: 'production' },
    { ...allowed, ALLOW_INTEGRATION_DB_RESET: 'false' },
    {
      ...allowed,
      DATABASE_URL: 'postgresql://user:pass@db.example.com/app_test',
    },
    {
      ...allowed,
      DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/pekara',
    },
  ]) {
    assert.throws(() => getIntegrationDatabaseUrl(environment));
  }
});

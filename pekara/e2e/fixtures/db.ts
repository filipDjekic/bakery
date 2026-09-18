import { spawnSync } from 'node:child_process';

import { test as base } from '@playwright/test';

type E2ESeed = {
  availableProductName: string;
  unavailableProductName: string;
  orderId: string;
  orderNumber: string;
};

function seedDatabase(): E2ESeed {
  const result = spawnSync(
    process.execPath,
    [
      '--env-file=.env.test',
      '--conditions=react-server',
      '--experimental-strip-types',
      'e2e/fixtures/seed.ts',
    ],
    { cwd: process.cwd(), encoding: 'utf8', env: process.env },
  );
  if (result.status !== 0) {
    throw new Error(`E2E seed failed: ${result.stderr || result.stdout}`);
  }
  const line = result.stdout
    .split(/\r?\n/)
    .find((entry) => entry.startsWith('E2E_SEED='));
  if (!line) throw new Error('E2E seed did not return fixture metadata.');
  return JSON.parse(line.slice('E2E_SEED='.length)) as E2ESeed;
}

export const test = base.extend<{ seed: E2ESeed }>({
  seed: [async ({}, use) => use(seedDatabase()), { auto: true }],
});

export { expect } from '@playwright/test';

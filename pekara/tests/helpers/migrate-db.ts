import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { getIntegrationDatabaseUrl } from './db.ts';

getIntegrationDatabaseUrl();
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL('../../node_modules/prisma/dist/prisma.js', import.meta.url),
    ),
    'db',
    'migrate',
    '--db',
    getIntegrationDatabaseUrl(),
    '--yes',
  ],
  { stdio: 'inherit', env: process.env },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}

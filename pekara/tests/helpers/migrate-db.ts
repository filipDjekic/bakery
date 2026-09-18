import { spawnSync } from 'node:child_process';

import { getIntegrationDatabaseUrl } from './db.ts';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(
  command,
  ['exec', 'prisma', 'db', 'migrate', '--db', getIntegrationDatabaseUrl(), '--yes'],
  { stdio: 'inherit', env: process.env },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}

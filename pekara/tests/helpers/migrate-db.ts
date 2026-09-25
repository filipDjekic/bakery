import { spawnSync } from 'node:child_process';

import { getIntegrationDatabaseUrl } from './db.ts';

const pnpmCli = process.env.npm_execpath;
const isExecutable = pnpmCli?.toLowerCase().endsWith('.exe') ?? false;
const command = isExecutable ? pnpmCli! : pnpmCli ? process.execPath : 'pnpm';
const result = spawnSync(
  command,
  [
    ...(pnpmCli && !isExecutable ? [pnpmCli] : []),
    'exec',
    'prisma',
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

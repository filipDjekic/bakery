import { spawnSync } from 'node:child_process';

const confirmation = process.env.CONFIRM_PRODUCTION_MIGRATION;
const databaseUrl = process.env.DATABASE_URL;

if (confirmation !== 'APPLY_REVIEWED_MIGRATIONS') {
  throw new Error(
    'Set CONFIRM_PRODUCTION_MIGRATION=APPLY_REVIEWED_MIGRATIONS after backup verification.',
  );
}
if (!databaseUrl || databaseUrl !== databaseUrl.trim()) {
  throw new Error('DATABASE_URL is missing or contains outer whitespace.');
}

const parsed = new URL(databaseUrl);
if (
  !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
  ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
) {
  throw new Error(
    'Production migration requires a non-loopback PostgreSQL URL.',
  );
}

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function runPrisma(args: string[]): void {
  const result = spawnSync(command, ['exec', 'prisma', ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runPrisma(['migration', 'check']);
runPrisma(['db', 'migrate', '--show', '--db', databaseUrl]);
runPrisma(['db', 'migrate', '--db', databaseUrl, '--yes']);
runPrisma(['db', 'verify', '--db', databaseUrl]);

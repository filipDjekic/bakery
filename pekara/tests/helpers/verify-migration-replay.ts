import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createIntegrationPool, getIntegrationDatabaseUrl } from './db.ts';
const url = new URL(getIntegrationDatabaseUrl());
const name = `bakery_replay_${crypto.randomUUID().replaceAll('-', '')}_test`;
const pool = createIntegrationPool();
let created = false;
function run(args: string[]) {
  const child = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL('../../node_modules/prisma/dist/prisma.js', import.meta.url),
      ),
      ...args,
    ],
    { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8' },
  );
  if (child.error || child.status !== 0)
    throw new Error(
      `Isolated migration ${args.join(' ')} failed (exit ${child.status}).`,
    );
  console.info(`Isolated ${args.join(' ')} passed.`);
}
try {
  if (!/^bakery_replay_[a-f0-9]{32}_test$/.test(name))
    throw new Error('Unsafe replay database name.');
  await pool.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  getIntegrationDatabaseUrl({ ...process.env, DATABASE_URL: url.toString() });
  run(['db', 'migrate', '--yes']);
  run(['db', 'verify']);
  run(['migration', 'status']);
} finally {
  // Only the exact fresh local DB created in this invocation is removed.
  if (created) await pool.query(`DROP DATABASE "${name}"`);
  await pool.end();
}

import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { getIntegrationDatabaseUrl } from '../../tests/helpers/db.ts';
Object.assign(
  process.env,
  parse(
    readFileSync(
      process.env.BENCH_ENV_FILE ?? '.cache/performance/isolated.env',
    ),
  ),
);
getIntegrationDatabaseUrl({ ...process.env, NODE_ENV: 'test' });
const command = process.argv[2] ?? 'start';
if (command === 'dev') {
  // Reuse the same explicitly guarded synthetic fixture for development-only
  // diagnostics. Never load the normal development database in this process.
  process.env.NODE_ENV = 'development';
  delete process.env.APP_ENV;
  delete process.env.LOCAL_PRODUCTION_HOST;
  const app = new URL(process.env.APP_URL);
  const next = new URL(
    '../../node_modules/next/dist/bin/next',
    import.meta.url,
  );
  process.argv = [
    process.execPath,
    fileURLToPath(next),
    'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    app.port || '80',
  ];
  await import(next.href);
} else {
  process.argv = [process.execPath, 'scripts/local-runtime.mjs', command];
  await import('../local-runtime.mjs');
}

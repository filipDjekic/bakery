import { loadEnvFile } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getIntegrationDatabaseUrl } from '../tests/helpers/db.ts';
loadEnvFile('.env.test');
getIntegrationDatabaseUrl({ ...process.env, NODE_ENV: 'test' });
const production =
  process.env.CI === 'true' || process.env.E2E_PRODUCTION === 'true';
Object.assign(process.env, {
  NODE_ENV: production ? 'production' : 'development',
  APP_URL: 'http://127.0.0.1:3000',
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  TRUSTED_PROXY_MODE: 'local',
  EMAIL_ENABLED: 'false',
  BLOB_ENABLED: 'false',
  SENTRY_ENABLED: 'false',
  NEXT_PUBLIC_SENTRY_ENABLED: 'false',
  NEXT_TELEMETRY_DISABLED: '1',
});
// Run the official CLI in this process so Playwright owns the server lifecycle.
// A nested spawned server can outlive Windows test teardown.
const next = fileURLToPath(
  new URL('../node_modules/next/dist/bin/next', import.meta.url),
);
process.argv = [
  process.execPath,
  next,
  production ? 'start' : 'dev',
  '-H',
  '127.0.0.1',
  '-p',
  '3000',
];
await import(pathToFileURL(next).href);

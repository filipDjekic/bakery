import { loadEnvFile } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getIntegrationDatabaseUrl } from '../../tests/helpers/db.ts';
loadEnvFile('.env.test');
getIntegrationDatabaseUrl({ ...process.env, NODE_ENV: 'test' });
Object.assign(process.env, {
  NODE_ENV: 'production',
  APP_URL: 'http://127.0.0.1:3000',
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  TRUSTED_PROXY_MODE: 'local',
  EMAIL_ENABLED: 'false',
  BLOB_ENABLED: 'false',
  SENTRY_ENABLED: 'false',
  NEXT_PUBLIC_SENTRY_ENABLED: 'false',
  NEXT_TELEMETRY_DISABLED: '1',
  SENTRY_AUTH_TOKEN: '',
  SENTRY_DSN: '',
  NEXT_PUBLIC_SENTRY_DSN: '',
});
const next = fileURLToPath(
  new URL('../../node_modules/next/dist/bin/next', import.meta.url),
);
process.argv = [process.execPath, next, 'build'];
await import(pathToFileURL(next).href);

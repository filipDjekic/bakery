import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve('next/package.json'));
const { loadEnvConfig } = nextRequire('@next/env');
const command = process.argv[2];
if (!['build', 'start'].includes(command) || process.argv.length !== 3)
  throw new Error('Use build:local or start:local without host/port overrides.');
process.env.NODE_ENV = 'production';
loadEnvConfig(process.cwd(), false);
Object.assign(process.env, {
  APP_ENV: 'local-production',
  LOCAL_PRODUCTION_HOST: '127.0.0.1',
  TRUSTED_PROXY_MODE: 'local',
});
const { parseServerEnvironment } = await import('../src/config/env.ts');
const { isLocalProductionRuntime } = await import('../src/config/local-production.ts');
parseServerEnvironment(process.env, { allowLocalProduction: true });
if (!isLocalProductionRuntime(process.env)) throw new Error('Invalid local runtime.');
const app = new URL(process.env.APP_URL);
if (!['localhost', '127.0.0.1'].includes(app.hostname))
  throw new Error('The IPv4 local launcher requires localhost or 127.0.0.1.');
const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
process.argv = [process.execPath, next, command,
  ...(command === 'start' ? ['--hostname', '127.0.0.1', '--port', app.port || '80'] : [])];
await import(pathToFileURL(next).href);

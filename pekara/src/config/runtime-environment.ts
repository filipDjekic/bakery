import 'server-only';
import { parseServerEnvironment } from './env.ts';
/** The HTTP loopback harness may exercise a production build only against its
 * explicitly enabled loopback *_test DB. This never exempts a public deployment. */
export function isIsolatedTestRuntime(env: NodeJS.ProcessEnv): boolean {
  try {
    const app = new URL(env.APP_URL ?? '');
    const database = new URL(env.DATABASE_URL ?? '');
    const local = (hostname: string) =>
      ['127.0.0.1', 'localhost', '[::1]'].includes(hostname);
    return (
      env.ALLOW_INTEGRATION_DB_RESET === 'true' &&
      env.TRUSTED_PROXY_MODE === 'local' &&
      ['postgres:', 'postgresql:'].includes(database.protocol) &&
      local(database.hostname) &&
      database.pathname.endsWith('_test') &&
      local(app.hostname) &&
      ['http:', 'https:'].includes(app.protocol)
    );
  } catch {
    return false;
  }
}
export function validateRuntimeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (
    env.NODE_ENV !== 'production' ||
    env.NEXT_PHASE === 'phase-production-build'
  )
    return;
  parseServerEnvironment(
    isIsolatedTestRuntime(env) ? { ...env, NODE_ENV: 'test' } : env,
    { allowLocalProduction: true },
  );
}

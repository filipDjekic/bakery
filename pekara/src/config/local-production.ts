/** Explicit opt-in used only by the loopback-bound local launcher. */
export function isLocalProductionRuntime(env: NodeJS.ProcessEnv): boolean {
  if (
    env.NODE_ENV !== 'production' ||
    env.APP_ENV !== 'local-production' ||
    env.LOCAL_PRODUCTION_HOST !== '127.0.0.1' ||
    env.TRUSTED_PROXY_MODE !== 'local' ||
    env.VERCEL || env.CI === 'true' || env.AWS_LAMBDA_FUNCTION_NAME ||
    env.K_SERVICE || env.RENDER || env.FLY_APP_NAME
  ) return false;
  try {
    const app = new URL(env.APP_URL ?? '');
    const auth = new URL(env.BETTER_AUTH_URL ?? env.APP_URL ?? '');
    const database = new URL(env.DATABASE_URL ?? '');
    const loopback = (hostname: string) =>
      ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
    return loopback(app.hostname) && loopback(auth.hostname) &&
      app.origin === auth.origin && app.protocol === 'http:' &&
      loopback(database.hostname) &&
      ['postgres:', 'postgresql:'].includes(database.protocol) &&
      !database.searchParams.has('host') && !database.searchParams.has('hostaddr');
  } catch {
    return false;
  }
}

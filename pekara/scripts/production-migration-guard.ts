import { parseServerEnvironment } from '../src/config/env.ts';
export function validateProductionMigration(env: NodeJS.ProcessEnv): void {
  if (env.CONFIRM_PRODUCTION_MIGRATION !== 'APPLY_REVIEWED_MIGRATIONS')
    throw new Error(
      'Explicit reviewed-migration and verified-backup confirmation is required.',
    );
  parseServerEnvironment({ ...env, NODE_ENV: 'production' });
  const url = new URL(env.DATABASE_URL ?? '');
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error(
      'Production migration requires a non-loopback PostgreSQL URL.',
    );
}

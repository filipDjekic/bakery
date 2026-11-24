import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { parse } from 'dotenv';
import type { BetterAuthOptions } from 'better-auth';
import { z } from 'zod';

export class AdminPasswordResetError extends Error {}

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const emailSchema = z.string().trim().toLowerCase().email();
type EnvironmentValues = Readonly<Record<string, string | undefined>>;

/** Read only the explicit local file; inherited shell credentials never select
 * another account/database. No connection or auth module is loaded before this. */
export function validateLocalResetEnvironment(
  local: EnvironmentValues,
  runtime: EnvironmentValues,
  args: string[],
) {
  if (args.length !== 1 || args[0] !== '--confirm-local') {
    throw new AdminPasswordResetError(
      'Local reset requires --confirm-local. Stop the local app before resetting.',
    );
  }
  for (const env of [local, runtime]) {
    if (
      (env.NODE_ENV && !['development', 'test'].includes(env.NODE_ENV)) ||
      (env.CI && env.CI !== 'false') ||
      (env.VERCEL && env.VERCEL !== '0') ||
      env.VERCEL_ENV ||
      env.AWS_LAMBDA_FUNCTION_NAME ||
      env.K_SERVICE
    ) {
      throw new AdminPasswordResetError(
        'Password reset is restricted to a local development shell.',
      );
    }
  }

  let database: URL;
  try {
    database = new URL(local.DATABASE_URL ?? '');
  } catch {
    throw new AdminPasswordResetError(
      'Set a local PostgreSQL DATABASE_URL in .env.',
    );
  }
  // pg accepts connection options in URL query parameters, including host
  // overrides. Reject them here rather than checking only a misleading hostname.
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    !localHosts.has(database.hostname) ||
    database.pathname.length < 2 ||
    database.search ||
    database.hash ||
    local.DATABASE_URL !== local.DATABASE_URL?.trim()
  ) {
    throw new AdminPasswordResetError(
      'DATABASE_URL must target loopback PostgreSQL with a database name and no query parameters.',
    );
  }

  for (const key of ['APP_URL', 'BETTER_AUTH_URL'] as const) {
    if (key === 'BETTER_AUTH_URL' && !local[key]) continue;
    try {
      const origin = new URL(local[key] ?? '');
      if (
        !['http:', 'https:'].includes(origin.protocol) ||
        !localHosts.has(origin.hostname) ||
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash ||
        local[key] !== local[key]?.trim()
      )
        throw new Error();
    } catch {
      throw new AdminPasswordResetError(
        `${key} must be a loopback application origin in .env.`,
      );
    }
  }
  for (const key of ['DATABASE_URL', 'APP_URL', 'BETTER_AUTH_URL'] as const) {
    if (runtime[key] && runtime[key] !== local[key]) {
      throw new AdminPasswordResetError(
        `Inherited ${key} differs from .env. Clear it before retrying.`,
      );
    }
  }
  const email = emailSchema.safeParse(local.ADMIN_EMAIL);
  if (!email.success || !local.ADMIN_PASSWORD) {
    throw new AdminPasswordResetError(
      'Set a valid ADMIN_EMAIL and ADMIN_PASSWORD in .env.',
    );
  }
  return { email: email.data, password: local.ADMIN_PASSWORD };
}

export async function resetExistingAdminPassword(input: {
  email: string;
  password: string;
}) {
  const { auth } = await import('../src/server/auth/auth.ts');
  const { authPrisma } = await import('../src/server/auth/prisma.ts');
  const context = await auth.$context;
  const authOptions: BetterAuthOptions = context.options;
  // Current auth uses DB sessions, without cookie cache or secondary storage.
  // Refuse future configurations where deleting DB sessions alone is insufficient.
  if (
    authOptions.session?.cookieCache?.enabled ||
    authOptions.secondaryStorage
  ) {
    throw new AdminPasswordResetError(
      'This reset requires uncached database sessions.',
    );
  }
  const { minPasswordLength, maxPasswordLength } = context.password.config;
  if (
    input.password.length < minPasswordLength ||
    input.password.length > maxPasswordLength
  ) {
    throw new AdminPasswordResetError(
      `ADMIN_PASSWORD must contain ${minPasswordLength}-${maxPasswordLength} characters.`,
    );
  }
  const passwordHash = await context.password.hash(input.password);
  return authPrisma.$transaction(
    async (tx) => {
      // Protect the role check from concurrent user edits. No user field changes.
      const users = await tx.$queryRaw<Array<{ id: string; role: string }>>`
      SELECT "id", "role" FROM "user" WHERE "email" = ${input.email} FOR UPDATE
    `;
      const user = users[0];
      if (!user)
        throw new AdminPasswordResetError(
          'No existing user matches ADMIN_EMAIL.',
        );
      if (user.role !== 'ADMIN')
        throw new AdminPasswordResetError(
          'The existing user must have the ADMIN role.',
        );
      const accounts = await tx.account.findMany({
        where: { userId: user.id, providerId: 'credential' },
        select: { id: true },
      });
      if (accounts.length !== 1) {
        throw new AdminPasswordResetError(
          'Expected exactly one existing credential account; no account was created.',
        );
      }
      const updated = await tx.account.updateMany({
        where: {
          id: accounts[0].id,
          userId: user.id,
          providerId: 'credential',
        },
        data: { password: passwordHash },
      });
      if (updated.count !== 1)
        throw new AdminPasswordResetError(
          'Credential account changed; reset aborted.',
        );
      const revoked = await tx.session.deleteMany({
        where: { userId: user.id },
      });
      return { revokedSessions: revoked.count };
    },
    { maxWait: 5000, timeout: 10000 },
  );
}

export function resetFailureMessage(error: unknown): string {
  return error instanceof AdminPasswordResetError
    ? error.message
    : 'Administrator password reset failed. No credentials or database diagnostics are printed.';
}

async function main() {
  let local: EnvironmentValues;
  try {
    local = parse(readFileSync(new URL('../.env', import.meta.url)));
  } catch {
    throw new AdminPasswordResetError(
      'Cannot read the local pekara/.env file.',
    );
  }
  const input = validateLocalResetEnvironment(
    local,
    process.env,
    process.argv.slice(2),
  );
  for (const key of [
    'DATABASE_URL',
    'APP_URL',
    'BETTER_AUTH_URL',
    'BETTER_AUTH_SECRET',
  ] as const) {
    if (local[key] !== undefined) process.env[key] = local[key];
    else delete process.env[key];
  }
  delete process.env.ADMIN_PASSWORD;
  // Import only after all local/prod guards. No reset runs when imported by tests.
  const { authPrisma } = await import('../src/server/auth/prisma.ts');
  try {
    const result = await resetExistingAdminPassword(input);
    console.info(
      `Administrator password reset. Revoked sessions: ${result.revokedSessions}. Account identity, role and history preserved.`,
    );
  } finally {
    await authPrisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(resetFailureMessage(error));
    process.exitCode = 1;
  });
}

import 'server-only';
import { z } from 'zod';
import { isLocalProductionRuntime } from './local-production.ts';
function parsedUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
const trimmed = (name: string) =>
  z
    .string()
    .min(1, `${name} is required.`)
    .refine(
      (value) => value === value.trim(),
      `${name} must not contain outer whitespace.`,
    );
const optionalSecret = (name: string) => trimmed(name).optional();
const origin = (name: string) =>
  trimmed(name)
    .url()
    .refine((value) => {
      const url = parsedUrl(value);
      if (!url) return false;
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash
      );
    }, `${name} must be an HTTP(S) origin without credentials or a path.`);
const runtimeEnvSchema = z
  .object({
    APP_ENV: z.enum(['production', 'local-production']).default('production'),
    LOCAL_PRODUCTION_HOST: z.string().optional(),
    CI: z.string().optional(),
    AWS_LAMBDA_FUNCTION_NAME: z.string().optional(),
    K_SERVICE: z.string().optional(),
    RENDER: z.string().optional(),
    FLY_APP_NAME: z.string().optional(),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: trimmed('DATABASE_URL')
      .url()
      .refine(
        (value) =>
          ['postgres:', 'postgresql:'].includes(
            parsedUrl(value)?.protocol ?? '',
          ),
        'DATABASE_URL must use PostgreSQL.',
      ),
    APP_URL: origin('APP_URL'),
    BETTER_AUTH_URL: origin('BETTER_AUTH_URL').optional(),
    BETTER_AUTH_SECRET: optionalSecret('BETTER_AUTH_SECRET'),
    RATE_LIMIT_HMAC_SECRET: optionalSecret('RATE_LIMIT_HMAC_SECRET'),
    CRON_SECRET: optionalSecret('CRON_SECRET'),
    BLOB_READ_WRITE_TOKEN: optionalSecret('BLOB_READ_WRITE_TOKEN'),
    RESEND_API_KEY: optionalSecret('RESEND_API_KEY'),
    EMAIL_FROM: optionalSecret('EMAIL_FROM'),
    SENTRY_DSN: optionalSecret('SENTRY_DSN'),
    SENTRY_AUTH_TOKEN: optionalSecret('SENTRY_AUTH_TOKEN'),
    EMAIL_ENABLED: z.enum(['true', 'false']).default('false'),
    BLOB_ENABLED: z.enum(['true', 'false']).default('false'),
    SENTRY_ENABLED: z.enum(['true', 'false']).default('false'),
    VERCEL: z.string().optional(),
    TRUSTED_PROXY_MODE: z.enum(['proxy', 'local']).optional(),
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(1).max(5).optional(),
  })
  .superRefine((value, context) => {
    const issue = (key: string, message: string) =>
      context.addIssue({ code: 'custom', path: [key], message });
    if (value.NODE_ENV === 'production') {
      const localProduction = isLocalProductionRuntime(value);
      if (
        value.VERCEL === '1' &&
        (!value.CRON_SECRET || value.CRON_SECRET.length < 32)
      )
        issue(
          'CRON_SECRET',
          'CRON_SECRET must contain at least 32 characters for scheduled order processing.',
        );
      if (value.APP_ENV === 'local-production' && !localProduction)
        issue(
          'APP_ENV',
          'Local production requires the explicit loopback launcher, loopback application/database URLs and no deployment host.',
        );
      for (const key of [
        'BETTER_AUTH_SECRET',
        'RATE_LIMIT_HMAC_SECRET',
      ] as const)
        if (!value[key] || value[key].length < 32)
          issue(
            key,
            `${key} must contain at least 32 characters in production.`,
          );
      const app = parsedUrl(value.APP_URL);
      const auth = parsedUrl(value.BETTER_AUTH_URL ?? value.APP_URL);
      if (
        !localProduction &&
        app &&
        auth &&
        (app.protocol !== 'https:' || auth.protocol !== 'https:')
      )
        issue('APP_URL', 'Production application URLs must use HTTPS.');
      if (app && auth && app.origin !== auth.origin)
        issue(
          'BETTER_AUTH_URL',
          'BETTER_AUTH_URL and APP_URL must use the same origin.',
        );
      if (
        !localProduction &&
        value.VERCEL !== '1' &&
        (value.TRUSTED_PROXY_MODE !== 'proxy' || !value.TRUSTED_PROXY_HOPS)
      )
        issue(
          'TRUSTED_PROXY_MODE',
          'Configure an enforced trusted reverse proxy and its hop count.',
        );
    }
    for (const [enabled, keys] of [
      [value.EMAIL_ENABLED, ['RESEND_API_KEY', 'EMAIL_FROM']],
      [value.BLOB_ENABLED, ['BLOB_READ_WRITE_TOKEN']],
      [value.SENTRY_ENABLED, ['SENTRY_DSN']],
    ] as const) {
      if (enabled === 'true')
        for (const key of keys)
          if (!value[key])
            issue(key, `${key} is required when its integration is enabled.`);
    }
    if (value.EMAIL_ENABLED === 'true' && value.EMAIL_FROM) {
      const address =
        /<([^<>]+)>$/.exec(value.EMAIL_FROM)?.[1] ?? value.EMAIL_FROM;
      if (!z.email().safeParse(address).success)
        issue(
          'EMAIL_FROM',
          'EMAIL_FROM must contain a valid sender email address.',
        );
    }
    if (
      value.SENTRY_ENABLED === 'true' &&
      value.SENTRY_DSN &&
      !z.url().safeParse(value.SENTRY_DSN).success
    )
      issue('SENTRY_DSN', 'SENTRY_DSN must be a valid URL.');
  });
// Release preflight deliberately never accepts the local runtime exception.
export const serverEnvSchema = runtimeEnvSchema.superRefine(
  (value, context) => {
    if (value.APP_ENV === 'local-production')
      context.addIssue({
        code: 'custom',
        path: ['APP_ENV'],
        message:
          'Deployment preflight rejects local-production. Use start:local only on this computer.',
      });
  },
);
export function parseServerEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  { allowLocalProduction = false }: { allowLocalProduction?: boolean } = {},
) {
  // Hosts pass absent optional variables as empty strings. Whitespace is still rejected.
  return (allowLocalProduction ? runtimeEnvSchema : serverEnvSchema).parse(
    Object.fromEntries(
      Object.entries(environment).filter(([, value]) => value !== ''),
    ),
  );
}

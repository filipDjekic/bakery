import 'server-only';

import { z } from 'zod';

const noOuterWhitespace = (name: string) =>
  z
    .string()
    .min(1)
    .refine((value) => value === value.trim(), {
      message: `${name} must not contain leading or trailing whitespace.`,
    });

const optionalSecret = (name: string) =>
  z
    .string()
    .optional()
    .refine((value) => value === undefined || value === value.trim(), {
      message: `${name} must not contain leading or trailing whitespace.`,
    });

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: noOuterWhitespace('DATABASE_URL').url(),
    APP_URL: noOuterWhitespace('APP_URL').url(),
    BETTER_AUTH_URL: noOuterWhitespace('BETTER_AUTH_URL').url().optional(),
    BETTER_AUTH_SECRET: optionalSecret('BETTER_AUTH_SECRET'),
    RATE_LIMIT_HMAC_SECRET: optionalSecret('RATE_LIMIT_HMAC_SECRET'),
    BLOB_READ_WRITE_TOKEN: optionalSecret('BLOB_READ_WRITE_TOKEN'),
    RESEND_API_KEY: optionalSecret('RESEND_API_KEY'),
    EMAIL_FROM: optionalSecret('EMAIL_FROM'),
    SENTRY_DSN: optionalSecret('SENTRY_DSN'),
    SENTRY_AUTH_TOKEN: optionalSecret('SENTRY_AUTH_TOKEN'),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') return;

    for (const key of [
      'BETTER_AUTH_SECRET',
      'RATE_LIMIT_HMAC_SECRET',
      'BLOB_READ_WRITE_TOKEN',
      'SENTRY_DSN',
      'RESEND_API_KEY',
      'EMAIL_FROM',
    ] as const) {
      const secret = value[key];
      const requiresLongSecret = !['SENTRY_DSN', 'EMAIL_FROM'].includes(key);
      if (!secret || (requiresLongSecret && secret.length < 32)) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: !requiresLongSecret
            ? `${key} is required in production.`
            : `${key} must contain at least 32 characters in production.`,
        });
      }
    }

    const appUrl = new URL(value.APP_URL);
    const authUrl = new URL(value.BETTER_AUTH_URL ?? value.APP_URL);
    if (appUrl.protocol !== 'https:' || authUrl.protocol !== 'https:') {
      context.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'Production application URLs must use HTTPS.',
      });
    }
    if (appUrl.origin !== authUrl.origin) {
      context.addIssue({
        code: 'custom',
        path: ['BETTER_AUTH_URL'],
        message: 'BETTER_AUTH_URL and APP_URL must use the same origin.',
      });
    }
  });

export function parseServerEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return serverEnvSchema.parse(environment);
}

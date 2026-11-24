import { describe, expect, it } from 'vitest';

import { parseServerEnvironment } from './env';

const productionEnvironment = {
  NODE_ENV: 'production',
  VERCEL: '1',
  DATABASE_URL: 'postgresql://user:password@db.example.test:5432/pekara',
  APP_URL: 'https://pekara.example.test',
  BETTER_AUTH_URL: 'https://pekara.example.test',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  RATE_LIMIT_HMAC_SECRET: 'b'.repeat(32),
  BLOB_READ_WRITE_TOKEN: 'c'.repeat(32),
  RESEND_API_KEY: 're_'.padEnd(32, 'd'),
  EMAIL_FROM: 'Pekara <porudzbine@pekara.example.test>',
  SENTRY_DSN: 'https://public@example.test/1',
} satisfies NodeJS.ProcessEnv;

describe('parseServerEnvironment', () => {
  it('accepts a complete isolated production environment', () => {
    expect(parseServerEnvironment(productionEnvironment).APP_URL).toBe(
      productionEnvironment.APP_URL,
    );
  });

  it('rejects missing secrets, HTTP origins and whitespace', () => {
    expect(() =>
      parseServerEnvironment({
        ...productionEnvironment,
        APP_URL: 'http://pekara.example.test',
        BETTER_AUTH_URL: 'https://other.example.test',
        RATE_LIMIT_HMAC_SECRET: ' short-secret ',
        BLOB_READ_WRITE_TOKEN: undefined,
      }),
    ).toThrow();
  });
});

it('permits optional integrations to stay disabled and validates enabled integrations', () => {
  const env = {
    ...productionEnvironment,
    BLOB_READ_WRITE_TOKEN: undefined,
    RESEND_API_KEY: undefined,
    EMAIL_FROM: undefined,
    SENTRY_DSN: undefined,
  };
  expect(parseServerEnvironment(env).EMAIL_ENABLED).toBe('false');
  expect(() =>
    parseServerEnvironment({ ...env, EMAIL_ENABLED: 'true' }),
  ).toThrow();
  expect(() => parseServerEnvironment({ ...env, VERCEL: undefined })).toThrow();
});

it('normalizes absent optional host vars but rejects origin paths and non-Postgres URLs', () => {
  expect(
    parseServerEnvironment({
      ...productionEnvironment,
      TRUSTED_PROXY_MODE: '',
      TRUSTED_PROXY_HOPS: '',
      EMAIL_ENABLED: '',
    }).EMAIL_ENABLED,
  ).toBe('false');
  expect(() =>
    parseServerEnvironment({
      ...productionEnvironment,
      APP_URL: 'https://pekara.example.test/path',
    }),
  ).toThrow();
  expect(() =>
    parseServerEnvironment({
      ...productionEnvironment,
      DATABASE_URL: 'https://db.example.test',
    }),
  ).toThrow();
  expect(() =>
    parseServerEnvironment({
      ...productionEnvironment,
      EMAIL_ENABLED: 'true',
      EMAIL_FROM: 'bad',
    }),
  ).toThrow();
});

it('returns structured configuration errors for malformed URLs', () => {
  for (const change of [{ APP_URL: 'invalid' }, { DATABASE_URL: 'invalid' }]) {
    try {
      parseServerEnvironment({ ...productionEnvironment, ...change });
      throw new Error('Expected invalid configuration.');
    } catch (error) {
      expect(error).toHaveProperty('issues');
    }
  }
});

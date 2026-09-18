import { describe, expect, it } from 'vitest';

import { parseServerEnvironment } from './env';

const productionEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@db.example.test:5432/pekara',
  APP_URL: 'https://pekara.example.test',
  BETTER_AUTH_URL: 'https://pekara.example.test',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  RATE_LIMIT_HMAC_SECRET: 'b'.repeat(32),
  BLOB_READ_WRITE_TOKEN: 'c'.repeat(32),
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

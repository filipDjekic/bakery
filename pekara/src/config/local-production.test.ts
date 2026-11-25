import { describe, expect, it } from 'vitest';
import { getCookies } from 'better-auth/cookies';
import { parseServerEnvironment } from './env';
import { validateRuntimeEnvironment } from './runtime-environment';
import { isLocalProductionRuntime } from './local-production';

const local: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  APP_ENV: 'local-production',
  LOCAL_PRODUCTION_HOST: '127.0.0.1',
  TRUSTED_PROXY_MODE: 'local',
  APP_URL: 'http://localhost:3000',
  BETTER_AUTH_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/existing',
  BETTER_AUTH_SECRET: 'a'.repeat(64),
  RATE_LIMIT_HMAC_SECRET: 'b'.repeat(64),
};
describe('explicit local production runtime', () => {
  it('uses HTTP-only SameSite cookies on loopback and Secure cookies for HTTPS deployments', () => {
    const localCookie = getCookies({ baseURL: local.APP_URL }).sessionToken;
    const deployedCookie = getCookies({
      baseURL: 'https://bakery.example',
    }).sessionToken;
    expect(localCookie.attributes).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
    expect(deployedCookie.attributes).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    });
    expect(deployedCookie.name).toMatch(/^__Secure-/);
  });
  it('validates development, local production and strict deployed production independently', () => {
    expect(() =>
      parseServerEnvironment({
        ...local,
        NODE_ENV: 'development',
        APP_ENV: undefined,
      }),
    ).not.toThrow();
    expect(isLocalProductionRuntime(local)).toBe(true);
    expect(() => validateRuntimeEnvironment(local)).not.toThrow();
    expect(() =>
      parseServerEnvironment({
        ...local,
        APP_ENV: 'production',
        APP_URL: 'https://bakery.example',
        BETTER_AUTH_URL: 'https://bakery.example',
        TRUSTED_PROXY_MODE: 'proxy',
        TRUSTED_PROXY_HOPS: '1',
      }),
    ).not.toThrow();
  });
  it('never permits the local exception in deployment preflight', () => {
    expect(() => parseServerEnvironment(local)).toThrow(/preflight/);
    expect(() =>
      validateRuntimeEnvironment({ ...local, APP_ENV: 'production' }),
    ).toThrow(/HTTPS/);
  });
  it.each([
    { APP_URL: 'http://bakery.example' },
    { BETTER_AUTH_URL: 'http://127.0.0.1:3000' },
    { DATABASE_URL: 'postgresql://test:test@db.example/existing' },
    {
      DATABASE_URL:
        'postgresql://test:test@localhost/existing?host=remote.example',
    },
    { LOCAL_PRODUCTION_HOST: '0.0.0.0' },
    { LOCAL_PRODUCTION_HOST: undefined },
    { VERCEL: '1' },
    { CI: 'true' },
    { K_SERVICE: 'hosted' },
    { TRUSTED_PROXY_MODE: 'proxy' },
  ])(
    'fails closed for invalid local or hosted configurations: %j',
    (override) => {
      expect(isLocalProductionRuntime({ ...local, ...override })).toBe(false);
      expect(() =>
        validateRuntimeEnvironment({ ...local, ...override }),
      ).toThrow();
    },
  );
  it('still requires production-strength secrets and enabled integration credentials', () => {
    for (const override of [
      { BETTER_AUTH_SECRET: 'short' },
      { RATE_LIMIT_HMAC_SECRET: '' },
      { EMAIL_ENABLED: 'true' },
    ])
      expect(() =>
        validateRuntimeEnvironment({ ...local, ...override }),
      ).toThrow();
  });
});

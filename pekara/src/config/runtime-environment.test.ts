import { expect, it } from 'vitest';
import {
  isIsolatedTestRuntime,
  validateRuntimeEnvironment,
} from './runtime-environment';
const env = {
  NODE_ENV: 'production' as const,
  APP_URL: 'http://127.0.0.1:3000',
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:55432/isolated_test',
  ALLOW_INTEGRATION_DB_RESET: 'true',
  TRUSTED_PROXY_MODE: 'local',
};
it('permits only an explicit loopback test runtime and rejects public or non-test bypasses', () => {
  expect(isIsolatedTestRuntime(env)).toBe(true);
  expect(() => validateRuntimeEnvironment(env)).not.toThrow();
  for (const override of [
    { DATABASE_URL: 'postgresql://test:test@remote.example/isolated_test' },
    { DATABASE_URL: 'postgresql://test:test@127.0.0.1/live' },
    { APP_URL: 'https://bakery.example' },
    { ALLOW_INTEGRATION_DB_RESET: 'false' },
  ]) {
    expect(isIsolatedTestRuntime({ ...env, ...override })).toBe(false);
    expect(() => validateRuntimeEnvironment({ ...env, ...override })).toThrow();
  }
});
it('enforces core production secrets at runtime but leaves build-time preflight to release validation', () => {
  expect(() =>
    validateRuntimeEnvironment({ NODE_ENV: 'production' }),
  ).toThrow();
  expect(() =>
    validateRuntimeEnvironment({
      NODE_ENV: 'production',
      NEXT_PHASE: 'phase-production-build',
    }),
  ).not.toThrow();
});

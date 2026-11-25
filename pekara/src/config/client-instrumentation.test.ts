import { afterEach, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));
vi.mock('@sentry/nextjs', () => sdk);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});
it('does not initialize disabled browser telemetry or export a navigation hook', async () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'false');
  const instrument = await import('../../instrumentation-client');
  expect(sdk.init).not.toHaveBeenCalled();
  expect(instrument.onRouterTransitionStart).toBeUndefined();
});
it('preserves synchronous initialization, navigation tracking and redaction when enabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@sentry.example/1');
  const instrument = await import('../../instrumentation-client');
  expect(sdk.init).toHaveBeenCalledWith(
    expect.objectContaining({
      enabled: true,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      beforeSend: expect.any(Function),
    }),
  );
  expect(instrument.onRouterTransitionStart).toBe(
    sdk.captureRouterTransitionStart,
  );
});

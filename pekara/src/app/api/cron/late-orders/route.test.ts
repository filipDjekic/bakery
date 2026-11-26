import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/server/services/recover-order-notifications', () => ({
  recoverOrderNotifications: vi
    .fn()
    .mockResolvedValue({ recovered: 0, scanned: 0 }),
}));
vi.mock('@/server/services/process-late-orders', () => ({
  processLateOrders: vi
    .fn()
    .mockResolvedValue({ processed: 2, hasMore: false }),
}));
import { GET } from './route';
import { processLateOrders } from '@/server/services/process-late-orders';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it('fails closed without a configured secret and rejects incorrect credentials', async () => {
  vi.stubEnv('CRON_SECRET', '');
  expect(
    (await GET(new Request('http://localhost/api/cron/late-orders'))).status,
  ).toBe(401);
  vi.stubEnv('CRON_SECRET', 'test-secret');
  expect(
    (
      await GET(
        new Request('http://localhost/api/cron/late-orders', {
          headers: { authorization: 'Bearer wrong' },
        }),
      )
    ).status,
  ).toBe(401);
  expect(processLateOrders).not.toHaveBeenCalled();
});
it('processes only authenticated invocations with uncached responses', async () => {
  vi.stubEnv('CRON_SECRET', 'test-secret');
  const response = await GET(
    new Request('http://localhost/api/cron/late-orders', {
      headers: { authorization: 'Bearer test-secret' },
    }),
  );
  expect(await response.json()).toEqual({
    processed: 2,
    hasMore: false,
    notifications: { recovered: 0, scanned: 0 },
  });
  expect(response.headers.get('cache-control')).toBe('no-store');
});

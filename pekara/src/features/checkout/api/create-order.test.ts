import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOrderRequest } from './create-order';
const draft = {
  idempotencyKey: crypto.randomUUID(),
  customerName: 'Test',
  customerPhone: '+381641234567',
  pickupAt: '2026-11-27T10:00:00.000Z',
  items: [],
};
afterEach(() => vi.restoreAllMocks());
describe('checkout transport recovery', () => {
  it('keeps the same payload and idempotency key after an ambiguous network failure', async () => {
    const confirmation = {
      orderId: crypto.randomUUID(),
      orderNumber: 'TEST',
      status: 'NEW',
      pickupAt: draft.pickupAt,
      totalMinor: 100,
      currencyCode: 'RSD',
    };
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(Response.json(confirmation));
    await expect(createOrderRequest(draft)).rejects.toThrow('offline');
    await expect(createOrderRequest(draft)).resolves.toEqual(confirmation);
    expect(fetch.mock.calls[0]?.[1]?.body).toBe(fetch.mock.calls[1]?.[1]?.body);
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([
    null,
    { orderId: 'bad', status: 'NEW' },
    {
      orderId: crypto.randomUUID(),
      orderNumber: 'T',
      status: 'INVALID',
      pickupAt: 'bad',
      totalMinor: 1.5,
      currencyCode: 'RSD',
    },
  ])(
    'rejects malformed success without treating an order as confirmed: %j',
    async (value) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(value));
      await expect(createOrderRequest(draft)).rejects.toMatchObject({
        code: 'INTERNAL_ERROR',
      });
    },
  );
  it('recognizes non-JSON rate limits and Retry-After HTTP dates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('rate limited', {
        status: 429,
        headers: { 'Retry-After': new Date(Date.now() + 90_000).toUTCString() },
      }),
    );
    await expect(createOrderRequest(draft)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: expect.any(Number),
    });
  });
  it('malformed conflict details cannot crash checkout recovery', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        {
          requestId: 'T',
          error: {
            code: 'PRICE_CHANGED',
            message: 'Test',
            details: { items: [null] },
          },
        },
        { status: 409 },
      ),
    );
    await expect(createOrderRequest(draft)).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
  });
});

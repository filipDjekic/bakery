import assert from 'node:assert/strict';
import test from 'node:test';

import { createOrdersPostHandler } from '../../src/app/api/orders/route.ts';
import { createCheckoutPayloadHash } from '../../src/lib/payload-hash.ts';
import { OrderRateLimitExceededError } from '../../src/server/rate-limit/order-rate-limit.ts';
import { OrderDomainError } from '../../src/server/services/create-order.ts';
import type { OrderConfirmationDto } from '../../src/types/order.ts';
import { checkoutRequestSchema } from '../../src/validation/checkout.ts';

const payload = {
  idempotencyKey: '01995f3e-6332-7b7a-9d31-ced04863be80',
  customerName: 'Test Kupac',
  customerPhone: '+381641234567',
  pickupAt: '2026-09-17T10:00:00.000Z',
  items: [
    {
      productId: '01995f3e-6332-7b7a-9d31-ced04863be81',
      quantity: 2,
      displayPriceMinor: 15000,
    },
  ],
};

const confirmation: OrderConfirmationDto = {
  orderId: '01995f3e-6332-7b7a-9d31-ced04863be82',
  orderNumber: 'PK-260917-ABC234',
  status: 'NEW',
  pickupAt: payload.pickupAt,
  totalMinor: 30000,
  currencyCode: 'RSD',
};

function request(body: string, requestId = 'route-test-request'): Request {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
    body,
  });
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    findExisting: async () => null,
    create: async () => confirmation,
    enforceRateLimit: async () => undefined,
    isIdempotencyConflict: () => false,
    ...overrides,
  };
}

test('POST /api/orders creates an order and returns the public contract', async () => {
  let rateLimitCalls = 0;
  let createCalls = 0;
  const handler = createOrdersPostHandler(
    dependencies({
      enforceRateLimit: async () => {
        rateLimitCalls += 1;
      },
      create: async () => {
        createCalls += 1;
        return confirmation;
      },
    }),
  );

  const response = await handler(request(JSON.stringify(payload)));

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('x-request-id'), 'route-test-request');
  assert.deepEqual(await response.json(), confirmation);
  assert.equal(rateLimitCalls, 1);
  assert.equal(createCalls, 1);
});

test('a completed duplicate is returned safely without consuming rate limit', async () => {
  const parsed = checkoutRequestSchema.parse(payload);
  let rateLimitCalls = 0;
  let createCalls = 0;
  const handler = createOrdersPostHandler(
    dependencies({
      findExisting: async () => ({
        payloadHash: createCheckoutPayloadHash(parsed),
        value: confirmation,
      }),
      enforceRateLimit: async () => {
        rateLimitCalls += 1;
      },
      create: async () => {
        createCalls += 1;
        return confirmation;
      },
    }),
  );

  const response = await handler(request(JSON.stringify(payload)));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), confirmation);
  assert.equal(rateLimitCalls, 0);
  assert.equal(createCalls, 0);
});

test('malformed JSON and invalid payloads return stable validation errors', async () => {
  const handler = createOrdersPostHandler(dependencies());
  const malformed = await handler(request('{'));
  const invalid = await handler(
    request(JSON.stringify({ ...payload, items: [] })),
  );

  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get('x-request-id'), 'route-test-request');
  assert.equal((await malformed.json()).error.code, 'VALIDATION_ERROR');
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'VALIDATION_ERROR');
});

test('domain conflicts and rate limits use stable public errors', async () => {
  const unavailable = createOrdersPostHandler(
    dependencies({
      create: async () => {
        throw new OrderDomainError('PRODUCT_UNAVAILABLE', 'internal detail');
      },
    }),
  );
  const limited = createOrdersPostHandler(
    dependencies({
      enforceRateLimit: async () => {
        throw new OrderRateLimitExceededError(17);
      },
    }),
  );

  const unavailableResponse = await unavailable(
    request(JSON.stringify(payload)),
  );
  const unavailableBody = await unavailableResponse.json();
  const limitedResponse = await limited(request(JSON.stringify(payload)));

  assert.equal(unavailableResponse.status, 409);
  assert.equal(unavailableBody.error.code, 'PRODUCT_UNAVAILABLE');
  assert.doesNotMatch(unavailableBody.error.message, /internal detail/i);
  assert.equal(limitedResponse.status, 429);
  assert.equal(limitedResponse.headers.get('retry-after'), '17');
  assert.equal((await limitedResponse.json()).error.code, 'RATE_LIMITED');
});

test('unexpected failures do not expose internals', async () => {
  const handler = createOrdersPostHandler(
    dependencies({
      create: async () => {
        throw new Error('database password and private stack');
      },
    }),
  );

  const response = await handler(request(JSON.stringify(payload)));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(body), /database password|private stack/i);
});

import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { CheckoutRequest } from '../validation/checkout.ts';
import {
  canonicalPayloadSerializer,
  createCheckoutPayloadHash,
} from './payload-hash.ts';

const request: CheckoutRequest = {
  idempotencyKey: '00000000-0000-4000-8000-000000000001',
  customerName: 'Ana Anić',
  customerPhone: '+381641234567',
  customerEmail: undefined,
  note: 'Bez kese',
  pickupAt: '2026-09-18T08:30:00.000Z',
  items: [
    {
      productId: '00000000-0000-4000-8000-000000000002',
      quantity: 2,
    },
    {
      productId: '00000000-0000-4000-8000-000000000001',
      quantity: 1,
    },
  ],
};

test('canonical serialization is stable across key order and undefined fields', () => {
  assert.equal(
    canonicalPayloadSerializer({ b: 2, ignored: undefined, a: { d: 4, c: 3 } }),
    '{"a":{"c":3,"d":4},"b":2}',
  );
});

test('checkout hash ignores idempotency key and item order but detects changes', () => {
  const original = createCheckoutPayloadHash(request);
  const reordered = createCheckoutPayloadHash({
    ...request,
    idempotencyKey: '00000000-0000-4000-8000-000000000099',
    items: [...request.items].reverse(),
  });
  const changed = createCheckoutPayloadHash({
    ...request,
    items: request.items.map((item, index) =>
      index === 0 ? { ...item, quantity: item.quantity + 1 } : item,
    ),
  });

  assert.equal(original, reordered);
  assert.notEqual(original, changed);
  assert.match(original, /^[a-f0-9]{64}$/);
});

test('rejects values that JSON cannot serialize', () => {
  assert.throws(() => canonicalPayloadSerializer(undefined));
});

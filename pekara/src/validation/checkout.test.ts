import assert from 'node:assert/strict';
import { test } from 'vitest';

import { CART_LIMITS, CHECKOUT_LIMITS } from '../config/limits.ts';
import { normalizeCustomerPhone } from '../lib/phone.ts';
import { checkoutRequestSchema } from './checkout.ts';

const PRODUCT_ID = '2b5e1eb1-a026-4b90-9f80-b0e189741686';

function validRequest() {
  return {
    idempotencyKey: '4ef40ca4-a006-477a-9512-7af773afea45',
    customerName: '  Petar Petrović  ',
    customerPhone: '064 123 45 67',
    customerEmail: '  petar@example.com ',
    note: '  Bez kese  ',
    pickupAt: '2026-09-18T08:30:00.000Z',
    items: [{ productId: PRODUCT_ID, quantity: 2 }],
  };
}

test('normalizes valid Serbian customer data', () => {
  const result = checkoutRequestSchema.parse(validRequest());

  assert.equal(result.customerName, 'Petar Petrović');
  assert.equal(result.customerPhone, '+381641234567');
  assert.equal(result.customerEmail, 'petar@example.com');
  assert.equal(result.note, 'Bez kese');
});

test('normalizes blank optional fields to undefined', () => {
  const result = checkoutRequestSchema.parse({
    ...validRequest(),
    customerEmail: '   ',
    note: '',
  });

  assert.equal(result.customerEmail, undefined);
  assert.equal(result.note, undefined);
});

test('rejects whitespace name, invalid phone and malformed UUID values', () => {
  for (const request of [
    { ...validRequest(), customerName: '   ' },
    { ...validRequest(), customerPhone: '123' },
    { ...validRequest(), idempotencyKey: 'not-a-uuid' },
    {
      ...validRequest(),
      items: [{ productId: 'not-a-uuid', quantity: 1 }],
    },
  ]) {
    assert.equal(checkoutRequestSchema.safeParse(request).success, false);
  }
});

test('rejects duplicate products, excessive quantities and client prices', () => {
  assert.equal(
    checkoutRequestSchema.safeParse({
      ...validRequest(),
      items: [
        { productId: PRODUCT_ID, quantity: 1 },
        { productId: PRODUCT_ID, quantity: 1 },
      ],
    }).success,
    false,
  );
  assert.equal(
    checkoutRequestSchema.safeParse({
      ...validRequest(),
      items: [
        {
          productId: PRODUCT_ID,
          quantity: CART_LIMITS.maxItemQuantity + 1,
        },
      ],
    }).success,
    false,
  );
  assert.equal(
    checkoutRequestSchema.safeParse({
      ...validRequest(),
      items: [{ productId: PRODUCT_ID, quantity: 1, unitPriceMinor: 1 }],
    }).success,
    false,
  );
});

test('enforces item count, total quantity and note length limits', () => {
  const items = Array.from(
    { length: CART_LIMITS.maxDistinctItems },
    (_, index) => ({
      productId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      quantity: 3,
    }),
  );

  assert.equal(
    checkoutRequestSchema.safeParse({ ...validRequest(), items }).success,
    false,
  );
  assert.equal(
    checkoutRequestSchema.safeParse({
      ...validRequest(),
      note: 'a'.repeat(CHECKOUT_LIMITS.note + 1),
    }).success,
    false,
  );
});

test('phone helper accepts international format and rejects invalid input', () => {
  assert.equal(normalizeCustomerPhone('+381 64 123 4567'), '+381641234567');
  assert.equal(normalizeCustomerPhone('not a phone'), null);
});

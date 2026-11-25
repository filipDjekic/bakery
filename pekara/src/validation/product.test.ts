import assert from 'node:assert/strict';
import { test } from 'vitest';

import { normalizeProductSlug, productMutationSchema } from './product.ts';

const valid = {
  name: 'Čokoladni kroasan',
  slug: 'Čokoladni Kroasan',
  description: 'Kroasan sa čokoladnim punjenjem.',
  priceMinor: 25000,
  categoryId: crypto.randomUUID(),
  sortOrder: 1,
  isActive: true,
  isAvailable: true,
};

test('normalizes a product slug and trims shared fields', () => {
  const result = productMutationSchema.parse(valid);
  assert.equal(result.slug, undefined);
  assert.equal(normalizeProductSlug('  Hleb & Pecivo  '), 'hleb-pecivo');
});

test('rejects fractional and out-of-range prices', () => {
  assert.equal(
    productMutationSchema.safeParse({ ...valid, priceMinor: 12.5 }).success,
    false,
  );
  assert.equal(
    productMutationSchema.safeParse({ ...valid, priceMinor: -1 }).success,
    false,
  );
});

test('rejects malformed categories and markup descriptions', () => {
  assert.equal(
    productMutationSchema.safeParse({ ...valid, categoryId: 'category' })
      .success,
    false,
  );
  assert.equal(
    productMutationSchema.safeParse({ ...valid, description: '<b>Opis</b>' })
      .success,
    false,
  );
});

test('uses a controlled sale unit, defaults to a piece and rejects unsupported units', () => {
  assert.equal(productMutationSchema.parse(valid).unitLabel, 'komad');
  assert.equal(
    productMutationSchema.safeParse({ ...valid, unitLabel: '100 g' }).success,
    false,
  );
  assert.equal(
    productMutationSchema.safeParse({ ...valid, unitLabel: 'kilogram' })
      .success,
    true,
  );
  assert.equal(
    productMutationSchema.safeParse({ ...valid, name: '!!!' }).success,
    false,
  );
});

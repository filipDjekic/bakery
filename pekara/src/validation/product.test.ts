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
  assert.equal(result.slug, 'cokoladni-kroasan');
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

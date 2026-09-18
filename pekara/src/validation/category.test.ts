import assert from 'node:assert/strict';
import { test } from 'vitest';

import { categoryMutationSchema, categoryUpdateSchema } from './category.ts';

const valid = {
  name: 'Slatko pecivo',
  slug: 'Slatko Pecivo',
  description: 'Sveže pecivo.',
  sortOrder: 10,
  isActive: true,
};

test('normalizes category input and allows an empty optional description', () => {
  const result = categoryMutationSchema.parse({ ...valid, description: ' ' });
  assert.equal(result.slug, 'slatko-pecivo');
  assert.equal(result.description, null);
});

test('rejects invalid order, markup and malformed update ids', () => {
  assert.equal(
    categoryMutationSchema.safeParse({ ...valid, sortOrder: 1.5 }).success,
    false,
  );
  assert.equal(
    categoryMutationSchema.safeParse({ ...valid, description: '<b>x</b>' })
      .success,
    false,
  );
  assert.equal(
    categoryUpdateSchema.safeParse({
      ...valid,
      id: 'bad-id',
      confirmDeactivation: false,
    }).success,
    false,
  );
});

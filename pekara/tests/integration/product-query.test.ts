import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../src/prisma/db.ts';
import { getPublicProductBySlug } from '../../src/server/queries/product.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

const testRunId = crypto.randomUUID();
const slugPrefix = `product-query-${testRunId}`;
const categoryIds: string[] = [];

before(async () => {
  const activeCategory = await db.orm.public.Category.create({
    name: varchar('Product query active category', 80),
    slug: varchar(`${slugPrefix}-active-category`, 100),
    description: null,
    sortOrder: -20_000,
    isActive: true,
  });
  categoryIds.push(activeCategory.id);

  const inactiveCategory = await db.orm.public.Category.create({
    name: varchar('Product query inactive category', 80),
    slug: varchar(`${slugPrefix}-inactive-category`, 100),
    description: null,
    sortOrder: -19_999,
    isActive: false,
  });
  categoryIds.push(inactiveCategory.id);

  await db.orm.public.Product.createAll([
    {
      categoryId: activeCategory.id,
      name: varchar('Public product', 120),
      slug: varchar(`${slugPrefix}-public`, 140),
      description: varchar('Visible product detail', 1000),
      priceMinor: 12_345,
      isActive: true,
      isAvailable: false,
      sortOrder: 1,
    },
    {
      categoryId: activeCategory.id,
      name: varchar('Inactive product', 120),
      slug: varchar(`${slugPrefix}-inactive`, 140),
      description: varchar('Must not be public', 1000),
      priceMinor: 100,
      isActive: false,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: inactiveCategory.id,
      name: varchar('Product in inactive category', 120),
      slug: varchar(`${slugPrefix}-hidden-category`, 140),
      description: varchar('Must not be public', 1000),
      priceMinor: 200,
      isActive: true,
      isAvailable: true,
      sortOrder: 1,
    },
  ]);
});

after(async () => {
  await db.orm.public.Product.where((product) =>
    product.categoryId.in(categoryIds),
  ).deleteAll();
  await db.orm.public.Category.where((category) =>
    category.id.in(categoryIds),
  ).deleteAll();
});

test('returns an active product with its active category', async () => {
  const product = await getPublicProductBySlug(`${slugPrefix}-public`);

  assert.equal(product?.name, 'Public product');
  assert.equal(product?.priceMinor, 12_345);
  assert.equal(product?.isAvailable, false);
  assert.equal(product?.category.slug, `${slugPrefix}-active-category`);
});

test('does not expose inactive products or active products in inactive categories', async () => {
  assert.equal(await getPublicProductBySlug(`${slugPrefix}-inactive`), null);
  assert.equal(
    await getPublicProductBySlug(`${slugPrefix}-hidden-category`),
    null,
  );
});

test('returns null for missing and malformed slugs', async () => {
  assert.equal(await getPublicProductBySlug(`${slugPrefix}-missing`), null);
  assert.equal(await getPublicProductBySlug('INVALID SLUG'), null);
  assert.equal(await getPublicProductBySlug('a'.repeat(141)), null);
});

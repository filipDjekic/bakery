import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../src/prisma/db.ts';
import { getPublicCatalog } from '../../src/server/queries/catalog.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

const testRunId = crypto.randomUUID();
const slugPrefix = `catalog-query-${testRunId}`;
const categoryIds: string[] = [];

before(async () => {
  const visibleFirst = await db.orm.public.Category.create({
    name: varchar('Catalog test first', 80),
    slug: varchar(`${slugPrefix}-first`, 100),
    description: null,
    sortOrder: -20_000,
    isActive: true,
  });
  categoryIds.push(visibleFirst.id);

  const visibleSecond = await db.orm.public.Category.create({
    name: varchar('Catalog test second', 80),
    slug: varchar(`${slugPrefix}-second`, 100),
    description: null,
    sortOrder: -19_999,
    isActive: true,
  });
  categoryIds.push(visibleSecond.id);

  const hidden = await db.orm.public.Category.create({
    name: varchar('Catalog test hidden', 80),
    slug: varchar(`${slugPrefix}-hidden`, 100),
    description: null,
    sortOrder: -20_001,
    isActive: false,
  });
  categoryIds.push(hidden.id);

  await db.orm.public.Product.createAll([
    {
      categoryId: visibleFirst.id,
      name: varchar('Zulu', 120),
      slug: varchar(`${slugPrefix}-zulu`, 140),
      description: varchar('Available product', 1000),
      priceMinor: 100,
      isActive: true,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: visibleFirst.id,
      name: varchar('Beta', 120),
      slug: varchar(`${slugPrefix}-beta`, 140),
      description: varchar('Unavailable product', 1000),
      priceMinor: 200,
      isActive: true,
      isAvailable: false,
      sortOrder: 1,
    },
    {
      categoryId: visibleFirst.id,
      name: varchar('Alpha', 120),
      slug: varchar(`${slugPrefix}-alpha`, 140),
      description: varchar('Second product with the same sort order', 1000),
      priceMinor: 300,
      isActive: true,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      categoryId: visibleFirst.id,
      name: varchar('Inactive', 120),
      slug: varchar(`${slugPrefix}-inactive`, 140),
      description: varchar('Must not be returned', 1000),
      priceMinor: 400,
      isActive: false,
      isAvailable: true,
      sortOrder: 0,
    },
    {
      categoryId: hidden.id,
      name: varchar('Hidden category product', 120),
      slug: varchar(`${slugPrefix}-hidden-product`, 140),
      description: varchar('Must not be returned', 1000),
      priceMinor: 500,
      isActive: true,
      isAvailable: true,
      sortOrder: 0,
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

test('returns only active categories and products in deterministic order', async () => {
  const catalog = await getPublicCatalog();
  const fixtures = catalog.categories.filter((category) =>
    category.slug.startsWith(slugPrefix),
  );

  assert.deepEqual(
    fixtures.map((category) => category.slug),
    [`${slugPrefix}-first`, `${slugPrefix}-second`],
  );
  assert.deepEqual(
    fixtures[0]?.products.map((product) => product.name),
    ['Alpha', 'Beta', 'Zulu'],
  );
  assert.equal(fixtures[0]?.products[1]?.isAvailable, false);
  assert.deepEqual(fixtures[1]?.products, []);
});

test('filters by a validated active category slug', async () => {
  const catalog = await getPublicCatalog(`${slugPrefix}-first`);

  assert.equal(catalog.selectedCategorySlug, `${slugPrefix}-first`);
  assert.deepEqual(
    catalog.categories.map((category) => category.slug),
    [`${slugPrefix}-first`],
  );
  assert.ok(
    catalog.filterCategories.some(
      (category) => category.slug === `${slugPrefix}-second`,
    ),
  );
});

test('keeps a valid empty category selected', async () => {
  const catalog = await getPublicCatalog(`${slugPrefix}-second`);

  assert.equal(catalog.selectedCategorySlug, `${slugPrefix}-second`);
  assert.equal(catalog.categories.length, 1);
  assert.deepEqual(catalog.categories[0]?.products, []);
});

test('falls back to the full catalog for invalid or inactive slugs', async () => {
  for (const categorySlug of [
    `${slugPrefix}-missing`,
    `${slugPrefix}-hidden`,
  ]) {
    const catalog = await getPublicCatalog(categorySlug);

    assert.equal(catalog.selectedCategorySlug, null);
    assert.ok(catalog.categories.length > 1);
    assert.equal(
      catalog.categories.some((category) => category.slug === categorySlug),
      false,
    );
  }
});

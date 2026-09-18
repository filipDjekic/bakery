import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../src/prisma/db.ts';
import {
  getAdminCategories,
  getAdminCategory,
} from '../../src/server/queries/admin-categories.ts';
import {
  CategoryDomainError,
  createCategory,
  updateCategory,
} from '../../src/server/services/categories.ts';
import { getPublicCatalog } from '../../src/server/queries/catalog.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

const run = crypto.randomUUID();
const authorize = async () => ({ role: 'ADMIN' });
const categoryIds: string[] = [];

after(async () => {
  if (categoryIds.length) {
    await db.orm.public.Product.where((product) =>
      product.categoryId.in(categoryIds),
    ).deleteAll();
    await db.orm.public.Category.where((category) =>
      category.id.in(categoryIds),
    ).deleteAll();
  }
  await db.runtime().close();
});

function input(overrides: Record<string, unknown> = {}) {
  return {
    name: `Category ${run}`,
    slug: `category-${run}`,
    description: 'Opis kategorije',
    sortOrder: 50,
    isActive: true,
    ...overrides,
  };
}

test('creates, lists and edits a category without changing its slug', async () => {
  const created = await createCategory(input(), authorize);
  categoryIds.push(created.id);
  const rows = await getAdminCategories(authorize);
  assert.ok(rows.some((row) => row.id === created.id));
  await updateCategory(
    {
      ...input({
        name: 'Izmenjena kategorija',
        slug: 'ignored-new-slug',
        sortOrder: 5,
      }),
      id: created.id,
      confirmDeactivation: false,
    },
    authorize,
  );
  const details = await getAdminCategory(created.id, authorize);
  assert.equal(details?.name, 'Izmenjena kategorija');
  assert.equal(details?.slug, `category-${run}`);
  assert.equal(details?.sortOrder, 5);
});

test('rejects duplicate slugs', async () => {
  await assert.rejects(
    () => createCategory(input({ name: 'Duplikat' }), authorize),
    (error: unknown) =>
      error instanceof CategoryDomainError && error.code === 'DUPLICATE_SLUG',
  );
});

test('requires confirmation before hiding a category with active products from public catalog', async () => {
  const categoryId = categoryIds[0]!;
  const product = await db.orm.public.Product.create({
    categoryId,
    name: varchar(`Product ${run}`, 120),
    slug: varchar(`category-product-${run}`, 140),
    description: varchar('Test', 1000),
    priceMinor: 10000,
    imageUrl: null,
    imagePathname: null,
    imageWidth: null,
    imageHeight: null,
    isActive: true,
    isAvailable: true,
    sortOrder: 0,
  });
  const before = await getPublicCatalog();
  assert.ok(before.categories.some((category) => category.id === categoryId));
  await assert.rejects(
    () =>
      updateCategory(
        {
          ...input({ slug: 'ignored', sortOrder: 5, isActive: false }),
          id: categoryId,
          confirmDeactivation: false,
        },
        authorize,
      ),
    (error: unknown) =>
      error instanceof CategoryDomainError &&
      error.code === 'DEACTIVATION_CONFIRMATION_REQUIRED',
  );
  await updateCategory(
    {
      ...input({ slug: 'ignored', sortOrder: 5, isActive: false }),
      id: categoryId,
      confirmDeactivation: true,
    },
    authorize,
  );
  const after = await getPublicCatalog();
  assert.equal(
    after.categories.some((category) => category.id === categoryId),
    false,
  );
  const storedProduct = await db.orm.public.Product.select('isActive')
    .where({ id: product.id })
    .first();
  assert.equal(storedProduct?.isActive, true);
});

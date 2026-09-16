import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../src/prisma/db.ts';
import { getAdminProducts } from '../../src/server/queries/admin-products.ts';
import type {
  BlobStorage,
  StoredProductImage,
} from '../../src/server/images/blob-storage.ts';
import { createProduct } from '../../src/server/services/create-product.ts';
import { ProductDomainError } from '../../src/server/services/product-mutation.ts';
import { replaceProductImage } from '../../src/server/services/replace-product-image.ts';
import { updateProduct } from '../../src/server/services/update-product.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}
const run = crypto.randomUUID();
let activeCategoryId = '';
let inactiveCategoryId = '';
const productIds: string[] = [];
const authorize = async () => ({ role: 'ADMIN' });
const image: StoredProductImage = {
  url: `https://blob.example/${run}.png`,
  pathname: `products/${run}.png`,
  width: 1,
  height: 1,
};
const noopStorage: BlobStorage = {
  async upload() {
    throw new Error('unused');
  },
  async delete() {},
};

before(async () => {
  const active = await db.orm.public.Category.create({
    name: varchar(`Active ${run}`, 80),
    slug: varchar(`active-${run}`, 100),
    description: null,
    sortOrder: 0,
    isActive: true,
  });
  const inactive = await db.orm.public.Category.create({
    name: varchar(`Inactive ${run}`, 80),
    slug: varchar(`inactive-${run}`, 100),
    description: null,
    sortOrder: 0,
    isActive: false,
  });
  activeCategoryId = active.id;
  inactiveCategoryId = inactive.id;
});

after(async () => {
  if (productIds.length)
    await db.orm.public.Product.where((product) =>
      product.id.in(productIds),
    ).deleteAll();
  await db.orm.public.Category.where((category) =>
    category.id.in([activeCategoryId, inactiveCategoryId]),
  ).deleteAll();
});

function input(overrides: Record<string, unknown> = {}) {
  return {
    name: `Product ${run}`,
    slug: `product-${run}`,
    description: 'Plain description',
    priceMinor: 25000,
    categoryId: activeCategoryId,
    sortOrder: 1,
    isActive: true,
    isAvailable: true,
    image,
    ...overrides,
  };
}

test('creates a product and admin list includes active and inactive records', async () => {
  const created = await createProduct(input(), { authorize });
  productIds.push(created.id);
  const inactive = await db.orm.public.Product.create({
    categoryId: inactiveCategoryId,
    name: varchar(`Old ${run}`, 120),
    slug: varchar(`old-${run}`, 140),
    description: varchar('Old product', 1000),
    priceMinor: 10000,
    imageUrl: null,
    imagePathname: null,
    imageWidth: null,
    imageHeight: null,
    isActive: false,
    isAvailable: false,
    sortOrder: 2,
  });
  productIds.push(inactive.id);
  const rows = await getAdminProducts(authorize);
  assert.ok(rows.some((row) => row.id === created.id && row.isActive));
  assert.ok(
    rows.some(
      (row) => row.id === inactive.id && !row.isActive && !row.categoryIsActive,
    ),
  );
});

test('rejects inactive categories, duplicate slugs and active products without images', async () => {
  const deleted: string[] = [];
  const cleanupStorage: BlobStorage = {
    async upload() {
      throw new Error('unused');
    },
    async delete(pathname) {
      deleted.push(pathname);
    },
  };
  await assert.rejects(
    () =>
      createProduct(
        input({
          slug: `inactive-target-${run}`,
          categoryId: inactiveCategoryId,
        }),
        { authorize, storage: cleanupStorage },
      ),
    (error: unknown) =>
      error instanceof ProductDomainError && error.code === 'INACTIVE_CATEGORY',
  );
  await assert.rejects(
    () =>
      createProduct(input({ image: null, slug: `no-image-${run}` }), {
        authorize,
        storage: noopStorage,
      }),
    (error: unknown) =>
      error instanceof ProductDomainError && error.code === 'IMAGE_REQUIRED',
  );
  await assert.rejects(
    () =>
      createProduct(
        {
          ...input(),
          image: { ...image, pathname: `products/duplicate-${run}.png` },
        },
        { authorize, storage: cleanupStorage },
      ),
    (error: unknown) =>
      error instanceof ProductDomainError && error.code === 'DUPLICATE_SLUG',
  );
  assert.ok(deleted.includes(`products/duplicate-${run}.png`));
});

test('updates price without changing slug or historical order item snapshots', async () => {
  const productId = productIds[0]!;
  const order = await db.orm.public.Order.create({
    orderNumber: varchar(`T81-${run.slice(0, 8)}`, 32),
    idempotencyKey: crypto.randomUUID(),
    payloadHash: run,
    status: 'NEW',
    customerName: varchar('Test customer', 100),
    customerPhone: varchar('+381641234567', 20),
    customerEmail: null,
    note: null,
    pickupAt: new Date(Date.now() + 86_400_000).toISOString(),
    currencyCode: varchar('RSD', 3),
    subtotalMinor: 25000,
    totalMinor: 25000,
    cancellationReason: null,
  });
  await db.orm.public.OrderItem.create({
    orderId: order.id,
    productId,
    productName: varchar(`Product ${run}`, 120),
    unitPriceMinor: 25000,
    quantity: 1,
    subtotalMinor: 25000,
  });
  await updateProduct(
    {
      ...input({ id: undefined, image: undefined }),
      id: productId,
      slug: 'ignored-new-slug',
      changeSlug: false,
      priceMinor: 30000,
    },
    authorize,
  );
  const updated = await db.orm.public.Product.select('slug', 'priceMinor')
    .where({ id: productId })
    .first();
  const snapshot = await db.orm.public.OrderItem.select(
    'unitPriceMinor',
    'productName',
  )
    .where({ orderId: order.id })
    .first();
  assert.equal(updated?.slug, `product-${run}`);
  assert.equal(updated?.priceMinor, 30000);
  assert.equal(snapshot?.unitPriceMinor, 25000);
  await db.orm.public.Order.where({ id: order.id }).delete();
});

test('image replacement preserves old reference on DB failure and cleans in the safe order', async () => {
  const deleted: string[] = [];
  const storage: BlobStorage = {
    async upload() {
      throw new Error('unused');
    },
    async delete(pathname) {
      deleted.push(pathname);
    },
  };
  await assert.rejects(
    () =>
      replaceProductImage({
        storage,
        upload: async () => ({ ...image, pathname: 'products/new.png' }),
        updateDatabase: async () => {
          throw new Error('db failed');
        },
      }),
    /db failed/,
  );
  assert.deepEqual(deleted, ['products/new.png']);
  deleted.length = 0;
  const value = await replaceProductImage({
    storage,
    upload: async () => ({ ...image, pathname: 'products/new.png' }),
    updateDatabase: async () => ({
      value: 'ok',
      oldPathname: 'products/old.png',
    }),
  });
  assert.equal(value, 'ok');
  assert.deepEqual(deleted, ['products/old.png']);
});

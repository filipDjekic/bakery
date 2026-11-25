import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { db } from '../../src/prisma/db.ts';
import { createCategory } from '../../src/server/services/categories.ts';
import { createProduct } from '../../src/server/services/create-product.ts';
import { getAdminProductsPage } from '../../src/server/queries/admin-products.ts';
import { getAdminCategoriesPage } from '../../src/server/queries/admin-categories.ts';
import {
  getAdminOrders,
  getActiveAdminOrders,
} from '../../src/server/queries/admin-orders.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
const run = crypto.randomUUID().slice(0, 8);
const categories: string[] = [];
const orders: string[] = [];
const authorize = async () => undefined;
after(async () => {
  if (orders.length)
    await db.orm.public.Order.where((o) => o.id.in(orders)).deleteAll();
  if (categories.length) {
    await db.orm.public.Product.where((p) =>
      p.categoryId.in(categories),
    ).deleteAll();
    await db.orm.public.Category.where((c) => c.id.in(categories)).deleteAll();
  }
  await db.close();
});
test('catalog lists apply search, category, booleans and pagination together in the database', async () => {
  for (let i = 0; i < 27; i++) {
    const category = await createCategory(
      {
        name: `List${run} ${i}`,
        slug: 'ignored',
        description: '',
        sortOrder: i,
        isActive: true,
      },
      authorize,
    );
    categories.push(category.id);
  }
  const first = await getAdminCategoriesPage(
    { q: `list${run}`, active: 'true', page: '1' },
    authorize,
  );
  const second = await getAdminCategoriesPage(
    { q: `LIST${run}`, active: 'true', page: '2' },
    authorize,
  );
  assert.equal(first.pagination.totalItems, 27);
  assert.equal(first.items.length, 25);
  assert.equal(second.items.length, 2);
  assert.ok(
    !first.items.some((c) => second.items.some((other) => c.id === other.id)),
  );
  assert.equal(
    (await getAdminCategoriesPage({ q: `List${run}`, page: 'bad' }, authorize))
      .pagination.page,
    1,
  );
  for (let i = 0; i < 28; i++)
    await createProduct(
      {
        name: `Product${run} ${i}`,
        slug: 'ignored',
        categoryId: categories[0]!,
        description: 'Test',
        priceMinor: 12345,
        unitLabel: 'komad',
        isActive: false,
        isAvailable: i !== 27,
        sortOrder: i,
        image: null,
      },
      { authorize },
    );
  const result = await getAdminProductsPage(
    {
      q: `product${run}`,
      active: 'false',
      available: 'true',
      category: categories[0],
      page: '2',
    },
    authorize,
  );
  assert.equal(result.pagination.totalItems, 27);
  assert.equal(result.items.length, 2);
  assert.equal(
    (
      await getAdminProductsPage(
        { q: `Product${run}`, active: 'true' },
        authorize,
      )
    ).items.length,
    0,
  );
});
test('order number search is partial/case-insensitive and combines local-day filters with pagination', async () => {
  for (let i = 0; i < 27; i++) {
    const order = await persistOrder({
      orderNumber: `LS-${run}-${i}`,
      idempotencyKey: crypto.randomUUID(),
      payloadHash: run,
      customerName: 'Test',
      customerPhone: '+381641234567',
      pickupAt: '2026-11-26T08:00:00Z',
      currencyCode: 'RSD',
      totalMinor: 100,
      items: [],
    });
    orders.push(order.orderId);
    await db.orm.public.Order.where({ id: order.orderId }).update({
      createdAt: '2026-11-24T23:30:00Z',
    });
  }
  const result = await getAdminOrders(
    {
      q: `ls-${run}`,
      status: 'NEW',
      from: '2026-11-25',
      to: '2026-11-25',
      page: 2,
    },
    authorize,
  );
  assert.equal(result.pagination.totalItems, 27);
  assert.equal(result.orders.length, 2);
  assert.equal(
    (await getAdminOrders({ q: `LS-${run}-0` }, authorize)).pagination
      .totalItems,
    1,
  );
  assert.equal(
    (
      await getAdminOrders(
        { q: `ls-${run}`, from: '2026-11-24', to: '2026-11-24' },
        authorize,
      )
    ).pagination.totalItems,
    0,
  );
  const active1 = await getActiveAdminOrders(authorize, 1);
  const active2 = await getActiveAdminOrders(authorize, 2);
  assert.equal(active1.orders.length, 10);
  assert.equal(active2.orders.length, 10);
  assert.ok(
    !active1.orders.some((o) =>
      active2.orders.some((other) => o.id === other.id),
    ),
  );
});

import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { db } from '../../src/prisma/db.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
import { consumeRateLimit } from '../../src/server/rate-limit/order-rate-limit.ts';
import { createIntegrationPool } from '../helpers/db.ts';
import { resetIntegrationDatabase } from '../helpers/reset-db.ts';
import {
  createCatalogFixture,
  type CatalogFixture,
} from '../fixtures/catalog.ts';
import {
  seedOrderSettingsFixture,
  INTEGRATION_PICKUP_AT,
} from '../fixtures/orders.ts';
const pool = createIntegrationPool();
let catalog: CatalogFixture;
let orderId: string;
const keyHash = 'c'.repeat(64);
before(async () => {
  await resetIntegrationDatabase();
  await seedOrderSettingsFixture();
  catalog = await createCatalogFixture();
  const order = await persistOrder({
    orderNumber: `SQL-${crypto.randomUUID().slice(0, 20)}`,
    idempotencyKey: crypto.randomUUID(),
    payloadHash: 'constraints',
    customerName: 'Test',
    customerPhone: '+381641234567',
    pickupAt: INTEGRATION_PICKUP_AT,
    currencyCode: 'RSD',
    totalMinor: 12500,
    items: [
      {
        productId: catalog.available.id,
        productName: 'Test',
        unitPriceMinor: 12500,
        quantity: 1,
        subtotalMinor: 12500,
      },
    ],
  });
  orderId = order.orderId;
  await consumeRateLimit('constraints', keyHash, {
    limit: 2,
    windowSeconds: 60,
  });
});
after(async () => {
  await db.orm.public.Order.where({ id: orderId }).deleteAll();
  await db.orm.public.Product.where({
    categoryId: catalog.category.id,
  }).deleteAll();
  await db.orm.public.Category.where({ id: catalog.category.id }).deleteAll();
  await pool.query('DELETE FROM "actionRateLimitBucket" WHERE "keyHash"=$1', [
    keyHash,
  ]);
  await Promise.all([pool.end(), db.close()]);
});
test('PostgreSQL rejects invalid numeric, schedule, configuration and delivery writes', async (t) => {
  const cases: [string, string, unknown[]][] = [
    [
      'price',
      'UPDATE "product" SET "priceMinor"=-1 WHERE id=$1',
      [catalog.available.id],
    ],
    [
      'image',
      'UPDATE "product" SET "imageWidth"=0 WHERE id=$1',
      [catalog.available.id],
    ],
    [
      'order total',
      'UPDATE "order" SET "totalMinor"=-1 WHERE id=$1',
      [orderId],
    ],
    [
      'quantity',
      'UPDATE "orderItem" SET quantity=0 WHERE "orderId"=$1',
      [orderId],
    ],
    [
      'subtotal snapshot',
      'UPDATE "orderItem" SET "subtotalMinor"=1 WHERE "orderId"=$1',
      [orderId],
    ],
    [
      'weekday',
      'UPDATE "businessHours" SET weekday=0 WHERE "bakerySettingsId"=$1',
      ['default'],
    ],
    [
      'minute range',
      'UPDATE "businessHours" SET "closeMinute"=1441 WHERE "bakerySettingsId"=$1',
      ['default'],
    ],
    [
      'opening order',
      'UPDATE "businessHours" SET "closeMinute"="openMinute" WHERE "bakerySettingsId"=$1',
      ['default'],
    ],
    [
      'preparation',
      'UPDATE "bakerySettings" SET "minimumPreparationMinutes"=241 WHERE id=$1',
      ['default'],
    ],
    [
      'slot configuration',
      'UPDATE "bakerySettings" SET "pickupSlotMinutes"=7 WHERE id=$1',
      ['default'],
    ],
    [
      'rate count',
      'UPDATE "actionRateLimitBucket" SET count=-1 WHERE "keyHash"=$1',
      [keyHash],
    ],
    [
      'delivery attempts',
      `INSERT INTO "orderNotificationDelivery" (id,"orderId","recipientType",attempts,"updatedAt") VALUES ($1,$2,'customer',6,now())`,
      [crypto.randomUUID(), orderId],
    ],
  ];
  for (const [name, sql, params] of cases)
    await t.test(name, async () => {
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN');
        await assert.rejects(
          connection.query(sql, params),
          (error: unknown) =>
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === '23514',
        );
      } finally {
        await connection.query('ROLLBACK');
        connection.release();
      }
    });
  assert.equal(
    (await db.orm.public.Product.where({ id: catalog.available.id }).first())
      ?.priceMinor,
    12500,
  );
});

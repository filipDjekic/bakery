import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { db } from '../../src/prisma/db.ts';
import { changeOrderStatus } from '../../src/server/services/change-order-status.ts';
import {
  updateBakeryProfile,
  SettingsDomainError,
} from '../../src/server/services/settings.ts';
import { updateWorkingHours } from '../../src/server/services/update-working-hours.ts';
import { getAdminSettings } from '../../src/server/queries/admin-settings.ts';
import {
  createOrder,
  OrderDomainError,
} from '../../src/server/services/create-order.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
import { createIntegrationPool } from '../helpers/db.ts';
import {
  createCatalogFixture,
  type CatalogFixture,
} from '../fixtures/catalog.ts';
import {
  orderRequestFixture,
  INTEGRATION_NOW,
  INTEGRATION_PICKUP_AT,
} from '../fixtures/orders.ts';

const authorize = async () => ({
  id: 'concurrency-test',
  name: 'Test',
  email: 'test@example.test',
  role: 'ADMIN' as const,
});
let fixture: CatalogFixture;
let original: Awaited<ReturnType<typeof getAdminSettings>>;
const orders: string[] = [];
before(async () => {
  fixture = await createCatalogFixture();
  original = await getAdminSettings(authorize);
});

test('checkout rechecks the clock after waiting for locked inputs, rejecting a newly expired slot', async () => {
  const pool = createIntegrationPool();
  const client = await pool.connect();
  let current = INTEGRATION_NOW;
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT id FROM "bakerySettings" WHERE id=$1 FOR UPDATE',
      ['default'],
    );
    const creating = createOrder(orderRequestFixture(fixture.available.id), {
      now: () => current,
    });
    const outcome = creating.then(
      (value) => ({ value, error: null }),
      (error) => ({ value: null, error }),
    );
    await delay(30);
    current = INTEGRATION_NOW.plus({ hours: 2 });
    await client.query('COMMIT');
    const result = await outcome;
    assert.ok(
      result.error instanceof OrderDomainError &&
        result.error.code === 'INVALID_PICKUP_SLOT',
    );
    assert.equal(result.value, null);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});

test('checkout rejects a changed sale unit rather than silently changing the meaning of quantity', async () => {
  const current = (await db.orm.public.Product.where({
    id: fixture.available.id,
  }).first())!;
  try {
    await db.orm.public.Product.where({ id: current.id }).updateAll({
      unitLabel: 'gram' as typeof current.unitLabel,
    });
    await assert.rejects(
      createOrder(
        orderRequestFixture(current.id, {
          items: [
            {
              productId: current.id,
              quantity: 1,
              displayPriceMinor: current.priceMinor,
              displayUnitLabel: 'komad',
            },
          ],
        }),
        { now: INTEGRATION_NOW },
      ),
      (error) =>
        error instanceof OrderDomainError &&
        error.code === 'PRODUCT_UNAVAILABLE' &&
        Boolean(
          error.details?.items[0]?.productName?.includes('jedinica prodaje'),
        ),
    );
  } finally {
    await db.orm.public.Product.where({ id: current.id }).updateAll({
      unitLabel: current.unitLabel,
    });
  }
});
after(async () => {
  const current = await getAdminSettings(authorize);
  await updateWorkingHours(
    original.businessHours.map(({ weekday, openMinute, closeMinute }) => ({
      weekday,
      openMinute,
      closeMinute,
    })),
    current.updatedAt,
    authorize,
  );
  const settings = await getAdminSettings(authorize);
  await updateBakeryProfile(
    {
      bakeryName: original.bakeryName,
      phone: original.phone,
      address: original.address,
      expectedUpdatedAt: settings.updatedAt,
    },
    authorize,
  );
  if (orders.length)
    await db.orm.public.Order.where((row) => row.id.in(orders)).deleteAll();
  await db.orm.public.Product.where({
    categoryId: fixture.category.id,
  }).deleteAll();
  await db.orm.public.Category.where({ id: fixture.category.id }).deleteAll();
  await db.close();
});

test('real concurrent conditional status writes produce exactly one transition and history entry', async () => {
  const order = await persistOrder({
    orderNumber: `CC-${crypto.randomUUID().slice(0, 20)}`,
    idempotencyKey: crypto.randomUUID(),
    payloadHash: 'concurrency',
    customerName: 'Test',
    customerPhone: '+381641234567',
    pickupAt: INTEGRATION_PICKUP_AT,
    currencyCode: 'RSD',
    totalMinor: 12500,
    items: [
      {
        productId: fixture.available.id,
        productName: 'Test',
        unitPriceMinor: 12500,
        quantity: 1,
        subtotalMinor: 12500,
      },
    ],
  });
  orders.push(order.orderId);
  const outcomes = await Promise.allSettled([
    changeOrderStatus(
      {
        orderId: order.orderId,
        currentStatus: 'NEW',
        targetStatus: 'ACCEPTED',
      },
      authorize,
      INTEGRATION_NOW.toJSDate(),
    ),
    changeOrderStatus(
      {
        orderId: order.orderId,
        currentStatus: 'NEW',
        targetStatus: 'CANCELLED',
        cancellationReason: 'Test cancellation',
      },
      authorize,
      INTEGRATION_NOW.toJSDate(),
    ),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  const stored = await db.orm.public.Order.include('statusHistory')
    .where({ id: order.orderId })
    .first();
  assert.equal(stored?.statusHistory.length, 2);
  if (stored?.status === 'CANCELLED')
    assert.equal(stored.cancellationReason, 'Test cancellation');
  await assert.rejects(
    changeOrderStatus(
      {
        orderId: order.orderId,
        currentStatus: 'NEW',
        targetStatus: 'ACCEPTED',
      },
      authorize,
      INTEGRATION_NOW.toJSDate(),
    ),
  );
});

test('concurrent settings forms cannot overwrite the winning version', async () => {
  const settings = await getAdminSettings(authorize);
  const values = {
    phone: settings.phone,
    address: settings.address,
    expectedUpdatedAt: settings.updatedAt,
  };
  const results = await Promise.allSettled([
    updateBakeryProfile({ ...values, bakeryName: 'First' }, authorize),
    updateBakeryProfile({ ...values, bakeryName: 'Second' }, authorize),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(
    rejected?.status === 'rejected' &&
      rejected.reason instanceof SettingsDomainError &&
      rejected.reason.code === 'CONFLICT',
  );
});

test('concurrent working-hours replacements are complete, never merged', async () => {
  const { updatedAt } = await getAdminSettings(authorize);
  const first = [{ weekday: 1, openMinute: 360, closeMinute: 720 }];
  const second = [{ weekday: 2, openMinute: 480, closeMinute: 900 }];
  const results = await Promise.allSettled([
    updateWorkingHours(first, updatedAt, authorize),
    updateWorkingHours(second, updatedAt, authorize),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  const actual = (await getAdminSettings(authorize)).businessHours.map(
    ({ weekday, openMinute, closeMinute }) => ({
      weekday,
      openMinute,
      closeMinute,
    }),
  );
  assert.deepEqual(actual, results[0].status === 'fulfilled' ? first : second);
  const current = await getAdminSettings(authorize);
  await updateWorkingHours(
    original.businessHours.map(({ weekday, openMinute, closeMinute }) => ({
      weekday,
      openMinute,
      closeMinute,
    })),
    current.updatedAt,
    authorize,
  );
});

test('checkout waits for a concurrent product writer and validates its committed availability', async () => {
  const pool = createIntegrationPool();
  const writer = await pool.connect();
  try {
    await writer.query('BEGIN');
    await writer.query(
      'UPDATE "product" SET "isAvailable" = false WHERE id = $1',
      [fixture.available.id],
    );
    const pending = createOrder(orderRequestFixture(fixture.available.id), {
      now: INTEGRATION_NOW,
    });
    // Attach the rejection handler before releasing the writer.
    const rejected = assert.rejects(
      pending,
      (error: unknown) =>
        error instanceof OrderDomainError &&
        error.code === 'PRODUCT_UNAVAILABLE',
    );
    await writer.query('COMMIT');
    await rejected;
  } finally {
    await writer.query('ROLLBACK');
    writer.release();
    await pool.end();
  }
});

test('checkout waits for committed price, category, acceptance and hours changes', async (t) => {
  const pool = createIntegrationPool();
  const scenarios = [
    {
      name: 'price',
      code: 'PRICE_CHANGED',
      write: 'UPDATE "product" SET "priceMinor" = 13000 WHERE id = $1',
      params: [fixture.available.id],
    },
    {
      name: 'category',
      code: 'PRODUCT_UNAVAILABLE',
      write: 'UPDATE "category" SET "isActive" = false WHERE id = $1',
      params: [fixture.category.id],
    },
    {
      name: 'acceptance',
      code: 'ORDERS_DISABLED',
      write:
        'UPDATE "bakerySettings" SET "orderAcceptingEnabled" = false WHERE id = $1',
      params: ['default'],
    },
    {
      name: 'hours',
      code: 'INVALID_PICKUP_SLOT',
      write: `UPDATE "bakerySettings" SET "updatedAt" = date_trunc('milliseconds', now()) WHERE id = $1`,
      params: ['default'],
    },
  ];
  try {
    for (const scenario of scenarios)
      await t.test(scenario.name, async () => {
        await pool.query(
          'UPDATE "product" SET "isAvailable"=true, "priceMinor"=12500 WHERE id=$1',
          [fixture.available.id],
        );
        const writer = await pool.connect();
        let completed:
          Promise<{ error?: unknown; value?: unknown }> | undefined;
        const request = orderRequestFixture(fixture.available.id);
        try {
          await writer.query('BEGIN');
          await writer.query(scenario.write, scenario.params);
          if (scenario.name === 'hours')
            await writer.query(
              'DELETE FROM "businessHours" WHERE "bakerySettingsId"=$1',
              ['default'],
            );
          completed = createOrder(request, { now: INTEGRATION_NOW }).then(
            (value) => ({ value }),
            (error) => ({ error }),
          );
          let blocked = false;
          for (let n = 0; n < 100; n++) {
            const result = await pool.query<{ blocked: boolean }>(
              `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FOR SHARE%') AS blocked`,
            );
            if (result.rows[0]?.blocked) {
              blocked = true;
              break;
            }
            await delay(25);
          }
          assert.ok(
            blocked,
            'Checkout must be blocked on the uncommitted authoritative writer.',
          );
          await writer.query('COMMIT');
          const result = await completed;
          assert.ok(
            result.error instanceof OrderDomainError &&
              result.error.code === scenario.code,
          );
          assert.equal(
            await db.orm.public.Order.where({
              idempotencyKey: String(request.idempotencyKey),
            }).first(),
            null,
          );
        } finally {
          await writer.query('ROLLBACK');
          if (completed) await completed;
          writer.release();
          await pool.query(
            'UPDATE "category" SET "isActive"=true WHERE id=$1',
            [fixture.category.id],
          );
          await pool.query(
            'UPDATE "product" SET "priceMinor"=12500 WHERE id=$1',
            [fixture.available.id],
          );
          await pool.query(
            'UPDATE "bakerySettings" SET "orderAcceptingEnabled"=$1 WHERE id=$2',
            [original.orderAcceptingEnabled, 'default'],
          );
          if (scenario.name === 'hours') {
            const current = await getAdminSettings(authorize);
            await updateWorkingHours(
              original.businessHours.map(
                ({ weekday, openMinute, closeMinute }) => ({
                  weekday,
                  openMinute,
                  closeMinute,
                }),
              ),
              current.updatedAt,
              authorize,
            );
          }
        }
      });
  } finally {
    await pool.end();
  }
});

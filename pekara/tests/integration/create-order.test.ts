import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { DateTime } from 'luxon';

import { generateOrderNumber } from '../../src/lib/order-number.ts';
import { createCheckoutPayloadHash } from '../../src/lib/payload-hash.ts';
import { db } from '../../src/prisma/db.ts';
import { getPickupBakerySettings } from '../../src/server/repositories/bakery-settings.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
import {
  createOrder,
  OrderDomainError,
} from '../../src/server/services/create-order.ts';
import { getPickupSlotsForDate } from '../../src/server/services/pickup-slots.ts';
import { getPublicOrderConfirmation } from '../../src/server/queries/order-confirmation.ts';
import { checkoutRequestSchema } from '../../src/validation/checkout.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

const runId = crypto.randomUUID();
const slugPrefix = `create-order-${runId}`;
const idempotencyKeys: string[] = [];
let categoryId = '';
let availableProductId = '';
let unavailableProductId = '';
let pickupAt = '';
let fixedNow = DateTime.utc();

before(async () => {
  const category = await db.orm.public.Category.create({
    name: varchar('Create order test', 80),
    slug: varchar(`${slugPrefix}-category`, 100),
    description: null,
    sortOrder: -30_000,
    isActive: true,
  });
  categoryId = category.id;

  const available = await db.orm.public.Product.create({
    categoryId,
    name: varchar('Test proizvod', 120),
    slug: varchar(`${slugPrefix}-available`, 140),
    description: varchar('Test', 1000),
    priceMinor: 12_345,
    isActive: true,
    isAvailable: true,
    sortOrder: 0,
  });
  availableProductId = available.id;

  const unavailable = await db.orm.public.Product.create({
    categoryId,
    name: varchar('Nedostupan proizvod', 120),
    slug: varchar(`${slugPrefix}-unavailable`, 140),
    description: varchar('Test', 1000),
    priceMinor: 5_000,
    isActive: true,
    isAvailable: false,
    sortOrder: 1,
  });
  unavailableProductId = unavailable.id;

  const settings = await getPickupBakerySettings();
  fixedNow = DateTime.utc();

  for (let day = 0; day <= settings.maximumAdvanceDays; day += 1) {
    const date = fixedNow
      .setZone(settings.timezone)
      .plus({ days: day })
      .toISODate();

    if (!date) {
      continue;
    }

    const result = await getPickupSlotsForDate(date, fixedNow);

    if (result.slots[0]) {
      pickupAt = result.slots[0].value;
      break;
    }
  }

  assert.ok(pickupAt, 'Expected at least one pickup slot in configured range.');
});

after(async () => {
  if (idempotencyKeys.length > 0) {
    await db.orm.public.Order.where((order) =>
      order.idempotencyKey.in(idempotencyKeys),
    ).deleteAll();
  }
  if (categoryId) {
    await db.orm.public.Product.where({ categoryId }).deleteAll();
    await db.orm.public.Category.where({ id: categoryId }).deleteAll();
  }
  await db.runtime().close();
});

function request(productId = availableProductId, displayPriceMinor = 12_345) {
  const idempotencyKey = crypto.randomUUID();
  idempotencyKeys.push(idempotencyKey);
  return {
    idempotencyKey,
    customerName: 'Petar Petrović',
    customerPhone: '064 123 4567',
    customerEmail: 'petar@example.com',
    note: 'Bez kese',
    pickupAt,
    items: [{ productId, quantity: 2, displayPriceMinor }],
  };
}

test('creates an atomic NEW order from authoritative product prices', async () => {
  const input = request();
  const parsed = checkoutRequestSchema.parse(input);
  let customerNotificationAttempted = false;
  let bakeryNotificationAttempted = false;
  const result = await createOrder(input, {
    now: fixedNow,
    payloadHash: createCheckoutPayloadHash(parsed),
    notifications: {
      sendCustomer: async () => {
        customerNotificationAttempted = true;
        throw new Error('Simulated provider outage');
      },
      sendBakery: async () => {
        bakeryNotificationAttempted = true;
        throw new Error('Simulated provider outage');
      },
    },
  });

  assert.equal(result.status, 'NEW');
  assert.equal(result.totalMinor, 24_690);
  assert.equal(customerNotificationAttempted, true);
  assert.equal(bakeryNotificationAttempted, true);
  assert.match(result.orderNumber, /^PK-\d{6}-[2-9A-HJ-NP-Z]{6}$/);

  const order = await db.orm.public.Order.include('items')
    .include('statusHistory')
    .where({ id: result.orderId })
    .first();

  assert.ok(order);
  assert.equal(order.totalMinor, 24_690);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0]?.productName, 'Test proizvod');
  assert.equal(order.items[0]?.unitPriceMinor, 12_345);
  assert.equal(order.items[0]?.subtotalMinor, 24_690);
  assert.equal(order.statusHistory.length, 1);
  assert.equal(order.statusHistory[0]?.fromStatus, null);
  assert.equal(order.statusHistory[0]?.toStatus, 'NEW');

  const confirmation = await getPublicOrderConfirmation(result.orderId);
  assert.equal(confirmation?.orderNumber, result.orderNumber);
  assert.equal(confirmation?.items[0]?.productName, 'Test proizvod');
  assert.equal('customerPhone' in (confirmation ?? {}), false);
});

test('blocks unavailable or inactive products and changed display prices without creating an order', async () => {
  const unavailable = request(unavailableProductId, 5_000);
  const inactive = request(availableProductId, 12_345);
  const changedPrice = request(availableProductId, 1);

  await assert.rejects(
    createOrder(unavailable, { now: fixedNow }),
    (error: unknown) =>
      error instanceof OrderDomainError && error.code === 'PRODUCT_UNAVAILABLE',
  );
  await assert.rejects(
    createOrder(changedPrice, { now: fixedNow }),
    (error: unknown) =>
      error instanceof OrderDomainError && error.code === 'PRICE_CHANGED',
  );

  await db.orm.public.Product.where({ id: availableProductId }).update({
    isActive: false,
  });
  try {
    await assert.rejects(
      createOrder(inactive, { now: fixedNow }),
      (error: unknown) =>
        error instanceof OrderDomainError &&
        error.code === 'PRODUCT_UNAVAILABLE',
    );
  } finally {
    await db.orm.public.Product.where({ id: availableProductId }).update({
      isActive: true,
    });
  }

  for (const idempotencyKey of [
    unavailable.idempotencyKey,
    inactive.idempotencyKey,
    changedPrice.idempotencyKey,
  ]) {
    assert.equal(
      await db.orm.public.Order.where({ idempotencyKey }).first(),
      null,
    );
  }
});

test('rejects a pickup instant that is not on the authoritative slot grid', async () => {
  const input = request();
  input.pickupAt = DateTime.fromISO(pickupAt)
    .plus({ minutes: 1 })
    .toUTC()
    .toISO()!;

  await assert.rejects(
    createOrder(input, { now: fixedNow }),
    (error: unknown) =>
      error instanceof OrderDomainError && error.code === 'INVALID_PICKUP_SLOT',
  );
});

test('rolls back the order when an item insert fails', async () => {
  const idempotencyKey = crypto.randomUUID();
  idempotencyKeys.push(idempotencyKey);

  await assert.rejects(
    persistOrder({
      orderNumber: generateOrderNumber(fixedNow, 'Europe/Belgrade'),
      idempotencyKey,
      payloadHash: 'rollback-test',
      customerName: 'Rollback test',
      customerPhone: '+381641234567',
      pickupAt,
      currencyCode: 'RSD',
      totalMinor: 100,
      items: [
        {
          productId: availableProductId,
          productName: 'Test proizvod',
          unitPriceMinor: 100,
          quantity: 1,
          subtotalMinor: 2_147_483_648,
        },
      ],
    }),
  );

  assert.equal(
    await db.orm.public.Order.where({ idempotencyKey }).first(),
    null,
  );
});

test('invalid confirmation UUID is rejected before querying an order', async () => {
  assert.equal(await getPublicOrderConfirmation('not-a-uuid'), null);
});

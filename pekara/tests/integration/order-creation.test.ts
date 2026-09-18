import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { generateOrderNumber } from '../../src/lib/order-number.ts';
import { createCheckoutPayloadHash } from '../../src/lib/payload-hash.ts';
import { db } from '../../src/prisma/db.ts';
import {
  findOrderByIdempotencyKey,
  isIdempotencyKeyConflict,
  persistOrder,
} from '../../src/server/repositories/orders.ts';
import {
  createOrder,
  OrderDomainError,
} from '../../src/server/services/create-order.ts';
import {
  executeIdempotently,
  IdempotencyConflictError,
} from '../../src/server/services/idempotency.ts';
import {
  checkoutRequestSchema,
  type CheckoutRequestInput,
} from '../../src/validation/checkout.ts';
import { createCatalogFixture, type CatalogFixture } from '../fixtures/catalog.ts';
import {
  INTEGRATION_NOW,
  INTEGRATION_PICKUP_AT,
  orderRequestFixture,
  seedOrderSettingsFixture,
} from '../fixtures/orders.ts';
import { resetIntegrationDatabase } from '../helpers/reset-db.ts';

let catalog: CatalogFixture;

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

before(async () => {
  await resetIntegrationDatabase();
  await seedOrderSettingsFixture();
  catalog = await createCatalogFixture();
});

after(async () => {
  await resetIntegrationDatabase();
  await db.runtime().close();
});

async function submitIdempotently(input: CheckoutRequestInput) {
  const request = checkoutRequestSchema.parse(input);
  const payloadHash = createCheckoutPayloadHash(request);

  return executeIdempotently({
    idempotencyKey: request.idempotencyKey,
    payloadHash,
    findExisting: findOrderByIdempotencyKey,
    create: () => createOrder(request, { now: INTEGRATION_NOW, payloadHash }),
    isUniqueConflict: isIdempotencyKeyConflict,
  });
}

async function orderCount(idempotencyKey: string): Promise<number> {
  const result = await db.orm.public.Order.where({ idempotencyKey }).aggregate(
    (aggregate) => ({ count: aggregate.count() }),
  );
  return result.count;
}

test('valid order persists authoritative totals, history and historical snapshots', async () => {
  const input = orderRequestFixture(catalog.available.id);
  const result = await submitIdempotently(input);

  assert.equal(result.kind, 'created');
  assert.equal(result.value.status, 'NEW');
  assert.equal(result.value.totalMinor, 25_000);

  const stored = await db.orm.public.Order.include('items')
    .include('statusHistory')
    .where({ id: result.value.orderId })
    .first();
  assert.ok(stored);
  assert.equal(stored.items.length, 1);
  assert.deepEqual(
    {
      productName: stored.items[0]?.productName,
      unitPriceMinor: stored.items[0]?.unitPriceMinor,
      quantity: stored.items[0]?.quantity,
      subtotalMinor: stored.items[0]?.subtotalMinor,
    },
    {
      productName: 'Sveža kifla',
      unitPriceMinor: 12_500,
      quantity: 2,
      subtotalMinor: 25_000,
    },
  );
  assert.deepEqual(
    stored.statusHistory.map(({ fromStatus, toStatus }) => ({
      fromStatus,
      toStatus,
    })),
    [{ fromStatus: null, toStatus: 'NEW' }],
  );

  await db.orm.public.Product.where({ id: catalog.available.id }).update({
    name: varchar('Promenjeno ime', 120),
    priceMinor: 99_999,
  });
  const snapshot = await db.orm.public.OrderItem.where({
    orderId: result.value.orderId,
  }).first();
  assert.equal(snapshot?.productName, 'Sveža kifla');
  assert.equal(snapshot?.unitPriceMinor, 12_500);

  await db.orm.public.Product.where({ id: catalog.available.id }).update({
    name: varchar('Sveža kifla', 120),
    priceMinor: 12_500,
  });
});

test('inactive, unavailable and changed-price products leave no order behind', async () => {
  const cases = [
    {
      input: orderRequestFixture(catalog.inactive.id, {
        items: [
          {
            productId: catalog.inactive.id,
            quantity: 1,
            displayPriceMinor: 7_000,
          },
        ],
      }),
      code: 'PRODUCT_UNAVAILABLE',
    },
    {
      input: orderRequestFixture(catalog.unavailable.id, {
        items: [
          {
            productId: catalog.unavailable.id,
            quantity: 1,
            displayPriceMinor: 8_000,
          },
        ],
      }),
      code: 'PRODUCT_UNAVAILABLE',
    },
    {
      input: orderRequestFixture(catalog.available.id, {
        items: [
          {
            productId: catalog.available.id,
            quantity: 1,
            displayPriceMinor: 1,
          },
        ],
      }),
      code: 'PRICE_CHANGED',
    },
  ] as const;

  for (const scenario of cases) {
    await assert.rejects(
      createOrder(scenario.input, { now: INTEGRATION_NOW }),
      (error: unknown) =>
        error instanceof OrderDomainError && error.code === scenario.code,
    );
    assert.equal(await orderCount(scenario.input.idempotencyKey), 0);
  }
});

test('max quantity and invalid pickup slot are rejected before persistence', async () => {
  const excessive = orderRequestFixture(catalog.available.id, {
    items: [
      {
        productId: catalog.available.id,
        quantity: 21,
        displayPriceMinor: 12_500,
      },
    ],
  });
  const invalidSlot = orderRequestFixture(catalog.available.id, {
    pickupAt: '2026-09-14T07:01:00.000Z',
  });

  for (const [input, code] of [
    [excessive, 'VALIDATION_ERROR'],
    [invalidSlot, 'INVALID_PICKUP_SLOT'],
  ] as const) {
    await assert.rejects(
      createOrder(input, { now: INTEGRATION_NOW }),
      (error: unknown) =>
        error instanceof OrderDomainError && error.code === code,
    );
    assert.equal(await orderCount(input.idempotencyKey), 0);
  }
});

test('same idempotency key returns one order and changed payload conflicts', async () => {
  const input = orderRequestFixture(catalog.available.id);
  const first = await submitIdempotently(input);
  const duplicate = await submitIdempotently(input);

  assert.equal(first.kind, 'created');
  assert.equal(duplicate.kind, 'existing');
  assert.equal(duplicate.value.orderId, first.value.orderId);
  assert.equal(await orderCount(input.idempotencyKey), 1);

  await assert.rejects(
    submitIdempotently({ ...input, customerName: 'Drugi kupac' }),
    IdempotencyConflictError,
  );
  assert.equal(await orderCount(input.idempotencyKey), 1);
});

test('failed item persistence rolls back the complete transaction', async () => {
  const idempotencyKey = crypto.randomUUID();

  await assert.rejects(
    persistOrder({
      orderNumber: generateOrderNumber(INTEGRATION_NOW, 'Europe/Belgrade'),
      idempotencyKey,
      payloadHash: 'rollback-test',
      customerName: 'Rollback test',
      customerPhone: '+381641234567',
      pickupAt: INTEGRATION_PICKUP_AT,
      currencyCode: 'RSD',
      totalMinor: 100,
      items: [
        {
          productId: catalog.available.id,
          productName: 'Sveža kifla',
          unitPriceMinor: 100,
          quantity: 1,
          subtotalMinor: 2_147_483_648,
        },
      ],
    }),
  );

  assert.equal(await orderCount(idempotencyKey), 0);
});

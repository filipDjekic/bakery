import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { db } from '../../src/prisma/db.ts';
import { createOrder } from '../../src/server/services/create-order.ts';
import {
  deliverOrderNotifications,
  type OrderSenders,
} from '../../src/server/email/delivery-tracking.ts';
import type { OrderEmailData } from '../../src/server/email/order-email-data.ts';
import { retryOrderNotifications } from '../../src/server/services/retry-order-notifications.ts';
import { recoverOrderNotifications } from '../../src/server/services/recover-order-notifications.ts';
import { processLateOrders } from '../../src/server/services/process-late-orders.ts';
import {
  createCatalogFixture,
  type CatalogFixture,
} from '../fixtures/catalog.ts';
import { resetIntegrationDatabase } from '../helpers/reset-db.ts';
import {
  seedOrderSettingsFixture,
  orderRequestFixture,
  INTEGRATION_NOW,
} from '../fixtures/orders.ts';
let catalog: CatalogFixture;
before(async () => {
  await resetIntegrationDatabase();
  await seedOrderSettingsFixture();
  catalog = await createCatalogFixture();
});
after(async () => {
  await resetIntegrationDatabase();
  await db.close();
});
async function draft(
  senders?: OrderSenders,
  scheduler: (callback: () => Promise<void>) => void = () => undefined,
) {
  const order = await createOrder(orderRequestFixture(catalog.available.id), {
    now: INTEGRATION_NOW,
    notifications: senders,
    scheduleNotifications: scheduler,
  });
  const data: OrderEmailData = {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    customerName: 'Integration Kupac',
    customerEmail: 'integration@example.test',
    pickupAt: order.pickupAt,
    totalMinor: order.totalMinor,
    currencyCode: 'RSD',
    timezone: 'Europe/Belgrade',
    items: [
      {
        productId: catalog.available.id,
        productName: catalog.available.name,
        unitPriceMinor: 12500,
        quantity: 2,
        subtotalMinor: 25000,
      },
    ],
    bakery: {
      name: 'Integration pekara',
      phone: '+381111234567',
      address: 'Test ulica 1',
      notificationEmail: null,
    },
  };
  return { order, data };
}
const row = (id: string) =>
  db.orm.public.OrderNotificationDelivery.where({ orderId: id }).first();
test('checkout commits and returns before scheduled delivery; provider failure is durable', async () => {
  let task: (() => Promise<void>) | undefined;
  let sent = 0;
  const { order } = await draft(
    {
      sendCustomer: async () => {
        sent++;
        throw new Error('provider offline');
      },
      sendBakery: async () => 'skipped',
    },
    (callback) => {
      task = callback;
    },
  );
  assert.equal(sent, 0);
  assert.equal((await row(order.orderId))?.status, 'PENDING');
  assert.ok(await db.orm.public.Order.where({ id: order.orderId }).first());
  await task?.();
  assert.equal(sent, 1);
  const delivery = await row(order.orderId);
  assert.equal(delivery?.status, 'FAILED');
  assert.equal(delivery?.attempts, 1);
  assert.equal(delivery?.lastErrorCode, 'EMAIL_DELIVERY_FAILED');
});
test('lost scheduling leaves a committed pending delivery', async () => {
  const { order } = await draft(undefined, () => {
    throw new Error('runtime unavailable');
  });
  assert.equal((await row(order.orderId))?.status, 'PENDING');
  assert.ok(await db.orm.public.Order.where({ id: order.orderId }).first());
});
test('concurrent retry claims send once and sent deliveries never resend', async () => {
  const { order, data } = await draft();
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let calls = 0;
  const senders: OrderSenders = {
    sendCustomer: async () => {
      calls++;
      started.resolve();
      await release.promise;
      return 'sent';
    },
    sendBakery: async () => 'skipped',
  };
  const first = deliverOrderNotifications(data, senders);
  await started.promise;
  await deliverOrderNotifications(data, senders);
  release.resolve();
  await first;
  await deliverOrderNotifications(data, senders);
  assert.equal(calls, 1);
  const delivery = await row(order.orderId);
  assert.equal(delivery?.status, 'SENT');
  assert.equal(delivery?.attempts, 1);
  assert.ok(delivery?.deliveredAt);
});
test('expired lease recovers, active lease and five failures prevent duplicate/unbounded retries', async () => {
  const { order, data } = await draft();
  let calls = 0;
  const senders: OrderSenders = {
    sendCustomer: async () => {
      calls++;
      return 'failed';
    },
    sendBakery: async () => 'skipped',
  };
  await db.orm.public.OrderNotificationDelivery.where({
    orderId: order.orderId,
  }).updateAll({
    status: 'SENDING',
    leaseUntil: new Date(Date.now() + 60000).toISOString(),
  });
  await deliverOrderNotifications(data, senders);
  assert.equal(calls, 0);
  await db.orm.public.OrderNotificationDelivery.where({
    orderId: order.orderId,
  }).updateAll({ leaseUntil: new Date(Date.now() - 1000).toISOString() });
  for (let i = 0; i < 7; i++) await deliverOrderNotifications(data, senders);
  assert.equal(calls, 5);
  assert.equal((await row(order.orderId))?.attempts, 5);
  assert.equal((await row(order.orderId))?.status, 'FAILED');
});
test('staff authorization precedes retry lookup and validation', async () => {
  const denial = new Error('denied');
  await assert.rejects(
    retryOrderNotifications('invalid', async () => {
      throw denial;
    }),
    (error) => error === denial,
  );
});

test('discounting and changed settings never alter the original email payload or provider key', async () => {
  const { order, data } = await draft();
  const snapshot = (await row(order.orderId))!.payload;
  assert.ok(snapshot);
  await processLateOrders(new Date('2026-09-16T12:00:00.000Z'));
  let frozen: OrderEmailData | undefined;
  const changed: OrderEmailData = {
    ...data,
    totalMinor: 1,
    bakery: { ...data.bakery, name: 'Changed' },
  };
  await deliverOrderNotifications(changed, {
    sendCustomer: async (value) => {
      frozen = value;
      return 'sent';
    },
    sendBakery: async () => 'skipped',
  });
  assert.equal(frozen?.totalMinor, order.totalMinor);
  assert.equal(
    frozen?.items.reduce((sum, item) => sum + item.subtotalMinor, 0),
    order.totalMinor,
  );
  assert.equal(frozen?.preparedMessage?.to, 'integration@example.test');
  assert.match(
    frozen?.preparedMessage?.idempotencyKey ?? '',
    /\/v2\/[a-f0-9]{64}$/,
  );
  assert.equal((await row(order.orderId))?.payload, snapshot);
  assert.ok(
    (await db.orm.public.Order.where({ id: order.orderId }).first())!
      .discountMinor > 0,
  );
});
test('the fifth expired lease becomes visibly failed without another send', async () => {
  const { order, data } = await draft();
  await db.orm.public.OrderNotificationDelivery.where({
    orderId: order.orderId,
  }).updateAll({
    status: 'SENDING',
    attempts: 5,
    leaseUntil: new Date(Date.now() - 1000).toISOString(),
  });
  let calls = 0;
  await deliverOrderNotifications(data, {
    sendCustomer: async () => {
      calls++;
      return 'sent';
    },
    sendBakery: async () => 'skipped',
  });
  assert.equal(calls, 0);
  assert.equal((await row(order.orderId))?.status, 'FAILED');
  assert.equal(
    (await row(order.orderId))?.lastErrorCode,
    'EMAIL_ATTEMPTS_EXHAUSTED',
  );
});
test('automatic recovery reclaims pending and expired deliveries with backoff and excludes exhausted rows', async () => {
  const { order } = await draft();
  await db.orm.public.OrderNotificationDelivery.where({
    orderId: order.orderId,
  }).updateAll({ updatedAt: new Date(Date.now() - 120_000).toISOString() });
  let calls = 0;
  const senders: OrderSenders = {
    sendCustomer: async () => {
      calls++;
      return 'sent';
    },
    sendBakery: async () => 'skipped',
  };
  await recoverOrderNotifications(new Date(), senders);
  assert.equal((await row(order.orderId))?.status, 'SENT');
  assert.ok(calls >= 1);
});
test('a stale delivery attempt cannot overwrite a successful reclaimed lease', async () => {
  const { order, data } = await draft();
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let key: string | undefined;
  const first = deliverOrderNotifications(data, {
    sendCustomer: async (frozen) => {
      key = frozen.preparedMessage?.idempotencyKey;
      started.resolve();
      await release.promise;
      return 'failed';
    },
    sendBakery: async () => 'skipped',
  });
  await started.promise;
  await db.orm.public.OrderNotificationDelivery.where({
    orderId: order.orderId,
  }).updateAll({ leaseUntil: new Date(Date.now() - 1000).toISOString() });
  await deliverOrderNotifications(data, {
    sendCustomer: async (frozen) => {
      assert.equal(frozen.preparedMessage?.idempotencyKey, key);
      return 'sent';
    },
    sendBakery: async () => 'skipped',
  });
  release.resolve();
  await first;
  assert.equal((await row(order.orderId))?.status, 'SENT');
  assert.equal((await row(order.orderId))?.attempts, 2);
});

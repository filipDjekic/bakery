import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { DateTime } from 'luxon';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../src/prisma/db.ts';
import { getAdminDashboard } from '../../src/server/queries/admin-dashboard.ts';
import {
  ACTIVE_ADMIN_ORDERS_LIMIT,
  ADMIN_ORDERS_PAGE_SIZE,
  getActiveAdminOrders,
  getAdminOrders,
} from '../../src/server/queries/admin-orders.ts';
import { getPickupBakerySettings } from '../../src/server/repositories/bakery-settings.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

const runId = crypto.randomUUID();
const orderIds: string[] = [];
const orderNumberPrefix = `T71-${runId.slice(0, 8)}`;
const authorize = async () => ({ role: 'STAFF' });
const now = DateTime.utc();

before(async () => {
  const statuses = [
    'NEW',
    'ACCEPTED',
    'IN_PREPARATION',
    'READY',
    'COMPLETED',
    ...Array.from({ length: 27 }, () => 'CANCELLED' as const),
  ] as const;

  for (const [index, status] of statuses.entries()) {
    const order = await db.orm.public.Order.create({
      orderNumber: varchar(
        `${orderNumberPrefix}-${String(index).padStart(2, '0')}`,
        32,
      ),
      idempotencyKey: crypto.randomUUID(),
      payloadHash: `admin-order-query-${runId}-${index}`,
      status,
      customerName: varchar(`Admin query customer ${index}`, 100),
      customerPhone: varchar('+381641234567', 20),
      customerEmail: null,
      note: null,
      pickupAt:
        index === 0
          ? now.minus({ hours: 1 }).toISO()!
          : now.plus({ hours: index === 2 ? 2 : index + 1 }).toISO()!,
      currencyCode: varchar('RSD', 3),
      subtotalMinor: 1000 + index,
      totalMinor: 1000 + index,
      cancellationReason:
        status === 'CANCELLED' ? varchar('Test cancellation', 300) : null,
    });
    orderIds.push(order.id);
  }
});

after(async () => {
  await db.orm.public.Order.where((order) => order.id.in(orderIds)).deleteAll();
});

test('dashboard returns correct operational counts and newest NEW orders', async () => {
  const dashboard = await getAdminDashboard({ now, authorize });

  assert.ok(dashboard.counts.NEW >= 1);
  assert.ok(dashboard.counts.ACCEPTED >= 1);
  assert.ok(dashboard.counts.IN_PREPARATION >= 1);
  assert.ok(dashboard.counts.READY >= 1);
  assert.ok(dashboard.counts.todayCompleted >= 1);
  assert.ok(
    dashboard.recentNewOrders.some((order) =>
      order.orderNumber.startsWith(orderNumberPrefix),
    ),
  );
  assert.ok(dashboard.recentNewOrders.length <= 8);
});

test('orders query filters by status and paginates newest-first on the server', async () => {
  const firstPage = await getAdminOrders(
    { status: 'CANCELLED', page: 1 },
    authorize,
  );
  const secondPage = await getAdminOrders(
    { status: 'CANCELLED', page: 2 },
    authorize,
  );

  assert.equal(firstPage.orders.length, ADMIN_ORDERS_PAGE_SIZE);
  assert.ok(firstPage.orders.every((order) => order.status === 'CANCELLED'));
  assert.ok(firstPage.pagination.totalItems >= 27);
  assert.equal(secondPage.pagination.page, 2);
  assert.equal(
    firstPage.orders.some((order) =>
      secondPage.orders.some((other) => other.id === order.id),
    ),
    false,
  );
  assert.ok(
    firstPage.orders.every(
      (order, index, orders) =>
        index === 0 || order.createdAt <= orders[index - 1]!.createdAt,
    ),
  );
});

test('active queue includes only operational statuses and is pickup-first with stable ordering', async () => {
  const result = await getActiveAdminOrders(authorize);
  const seeded = result.orders.filter((order) =>
    order.orderNumber.startsWith(orderNumberPrefix),
  );

  assert.deepEqual(
    new Set(seeded.map((order) => order.status)),
    new Set(['NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY']),
  );
  assert.equal(
    seeded.some(
      (order) => order.status === 'COMPLETED' || order.status === 'CANCELLED',
    ),
    false,
  );
  assert.ok(result.orders.length <= ACTIVE_ADMIN_ORDERS_LIMIT);
  assert.equal(seeded[0]?.status, 'NEW');
  assert.ok(
    result.orders.every((order, index, orders) => {
      if (index === 0) return true;
      const previous = orders[index - 1]!;
      return (
        previous.pickupAt < order.pickupAt ||
        (previous.pickupAt === order.pickupAt &&
          (previous.createdAt < order.createdAt ||
            (previous.createdAt === order.createdAt &&
              previous.id <= order.id)))
      );
    }),
  );
  assert.deepEqual(Object.keys(result.orders[0] ?? {}).sort(), [
    'createdAt',
    'currencyCode',
    'customerName',
    'id',
    'orderNumber',
    'pickupAt',
    'status',
    'totalMinor',
  ]);
});

test('date filter uses bakery-local dates and excessive pages clamp to the end', async () => {
  const settings = await getPickupBakerySettings();
  const localDate = now.setZone(settings.timezone).toISODate();
  assert.ok(localDate);

  const filtered = await getAdminOrders(
    { from: localDate!, to: localDate!, page: 999_999 },
    authorize,
  );

  assert.equal(filtered.pagination.page, filtered.pagination.totalPages);
  assert.equal(filtered.filters.from, localDate);
  assert.equal(filtered.filters.to, localDate);
  assert.ok(
    filtered.orders.every(
      (order) =>
        DateTime.fromISO(order.createdAt, { zone: 'utc' })
          .setZone(settings.timezone)
          .toISODate() === localDate,
    ),
  );
});

test('invalid filters normalize safely and an empty result remains page one', async () => {
  const result = await getAdminOrders(
    { status: 'NOT_A_STATUS', page: '-5', from: 'not-a-date' },
    authorize,
  );

  assert.equal(result.pagination.page, 1);
  assert.equal(result.filters.status, undefined);
  assert.equal(result.filters.from, undefined);

  const empty = await getAdminOrders(
    { from: '2100-01-01', to: '2100-01-01' },
    authorize,
  );
  assert.equal(empty.orders.length, 0);
  assert.deepEqual(empty.pagination, {
    page: 1,
    pageSize: ADMIN_ORDERS_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
});

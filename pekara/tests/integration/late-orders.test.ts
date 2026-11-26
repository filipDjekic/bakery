import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { seedOrderSettingsFixture } from '../fixtures/orders.ts';
import { db } from '../../src/prisma/db.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
import { processLateOrders } from '../../src/server/services/process-late-orders.ts';
import { changeOrderStatus } from '../../src/server/services/change-order-status.ts';
import { getAdminOrders } from '../../src/server/queries/admin-orders.ts';
import { getAdminDashboard } from '../../src/server/queries/admin-dashboard.ts';
import { DateTime } from 'luxon';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
const ids: string[] = [];
before(async () => {
  await seedOrderSettingsFixture();
});
const now = new Date('2026-11-25T13:30:00.000Z');
const authorize = async () => ({
  id: 'late-test',
  role: 'STAFF' as const,
  name: 'Test',
  email: 'test@example.test',
});
async function order(
  pickupAt = '2026-11-25T13:29:59.999Z',
  totalMinor = 100010,
) {
  const result = await persistOrder({
    orderNumber: `LT-${crypto.randomUUID().slice(0, 20)}`,
    idempotencyKey: crypto.randomUUID(),
    payloadHash: 'test',
    customerName: 'Test',
    customerPhone: '+381641234567',
    pickupAt,
    currencyCode: 'RSD',
    totalMinor,
    items: [],
  });
  ids.push(result.orderId);
  await db.orm.public.OrderItem.create({
    orderId: result.orderId,
    productId: null,
    productName: 'Test snapshot' as Varchar<120>,
    unitLabel: 'gram' as Varchar<40>,
    unitPriceMinor: totalMinor,
    quantity: 1,
    subtotalMinor: totalMinor,
  });
  return result.orderId;
}
const stored = (id: string) =>
  db.orm.public.Order.include('statusHistory').where({ id }).first();
after(async () => {
  if (ids.length)
    await db.orm.public.Order.where((o) => o.id.in(ids)).deleteAll();
  await db.close();
});

test('parallel workers preserve every preparation stage and apply one discount event', async () => {
  for (const status of [
    'NEW',
    'ACCEPTED',
    'IN_PREPARATION',
    'READY',
  ] as const) {
    const id = await order();
    await db.orm.public.Order.where({ id }).updateAll({ status });
    const before = await db.orm.public.OrderItem.where({ orderId: id }).all();
    assert.equal(before.length, 1);
    assert.equal(before[0]?.unitLabel, 'gram');
    await Promise.all(Array.from({ length: 4 }, () => processLateOrders(now)));
    await processLateOrders(now);
    const row = (await stored(id))!;
    assert.equal(row.status, status);
    assert.equal(row.originalTotalMinor, 100010);
    assert.equal(row.discountMinor, 15002);
    assert.equal(row.totalMinor, 85008);
    assert.equal(Date.parse(row.lateDiscountAt!), now.getTime());
    const events = row.statusHistory.filter((h) =>
      h.reason?.includes('popust 15%'),
    );
    assert.equal(events.length, 1);
    assert.equal(events[0]?.fromStatus, status);
    assert.equal(events[0]?.toStatus, status);
    assert.deepEqual(
      await db.orm.public.OrderItem.where({ orderId: id }).all(),
      before,
    );
  }
});
test('overdue NEW and preparing orders remain actionable without premature readiness or completion', async () => {
  const id = await order();
  await processLateOrders(now);
  await assert.rejects(
    changeOrderStatus(
      { orderId: id, currentStatus: 'NEW', targetStatus: 'COMPLETED' },
      authorize,
      now,
    ),
  );
  for (const [currentStatus, targetStatus] of [
    ['NEW', 'ACCEPTED'],
    ['ACCEPTED', 'IN_PREPARATION'],
    ['IN_PREPARATION', 'READY'],
    ['READY', 'COMPLETED'],
  ] as const) {
    await changeOrderStatus(
      { orderId: id, currentStatus, targetStatus },
      authorize,
      now,
    );
  }
  const row = (await stored(id))!;
  assert.equal(row.status, 'COMPLETED');
  assert.equal(Date.parse(row.readyAt!), now.getTime());
  assert.equal(row.discountMinor, 15002);
});
test('ready on time still follows the documented missed-pickup discount policy', async () => {
  const id = await order();
  await db.orm.public.Order.where({ id }).updateAll({
    status: 'IN_PREPARATION',
  });
  const before = new Date('2026-11-25T13:00:00.000Z');
  await changeOrderStatus(
    { orderId: id, currentStatus: 'IN_PREPARATION', targetStatus: 'READY' },
    authorize,
    before,
  );
  assert.equal((await stored(id))?.discountMinor, 0);
  await processLateOrders(now);
  const row = (await stored(id))!;
  assert.equal(row.status, 'READY');
  assert.equal(Date.parse(row.readyAt!), before.getTime());
  assert.equal(row.discountMinor, 15002);
});
test('terminal orders, exact boundary and future instants remain immutable', async () => {
  const completed = await order();
  const cancelled = await order();
  const boundary = await order(now.toISOString());
  const future = await order('2026-11-25T13:30:00.001Z');
  await db.orm.public.Order.where({ id: completed }).updateAll({
    status: 'COMPLETED',
  });
  await db.orm.public.Order.where({ id: cancelled }).updateAll({
    status: 'CANCELLED',
  });
  const snapshots = await Promise.all([stored(completed), stored(cancelled)]);
  await processLateOrders(now);
  for (const id of [completed, cancelled, boundary, future]) {
    const row = (await stored(id))!;
    assert.equal(row.discountMinor, 0);
    assert.equal(row.originalTotalMinor, 100010);
    assert.equal(row.totalMinor, 100010);
  }
  await assert.rejects(
    changeOrderStatus(
      {
        orderId: completed,
        currentStatus: 'COMPLETED',
        targetStatus: 'CANCELLED',
        cancellationReason: 'Test',
      },
      authorize,
      now,
    ),
  );
  assert.deepEqual(
    await Promise.all([stored(completed), stored(cancelled)]),
    snapshots,
  );
});
test('staff-first, worker-first and concurrent completion produce the same price and one discount', async () => {
  for (const sequence of ['staff', 'worker', 'parallel']) {
    const id = await order();
    await db.orm.public.Order.where({ id }).updateAll({ status: 'READY' });
    const complete = () =>
      changeOrderStatus(
        { orderId: id, currentStatus: 'READY', targetStatus: 'COMPLETED' },
        authorize,
        now,
      );
    if (sequence === 'staff') {
      await complete();
      await processLateOrders(now);
    } else if (sequence === 'worker') {
      await processLateOrders(now);
      await complete();
    } else await Promise.all([processLateOrders(now), complete()]);
    const row = (await stored(id))!;
    assert.equal(row.status, 'COMPLETED');
    assert.equal(row.totalMinor, 85008);
    assert.equal(
      row.statusHistory.filter((h) => h.reason?.includes('popust 15%')).length,
      1,
    );
    assert.equal(
      row.statusHistory.filter((h) => h.toStatus === 'COMPLETED').length,
      1,
    );
  }
});
test('DST repeated wall times are distinct instants', async () => {
  const earlier = await order('2026-10-25T00:30:00.000Z', 100000);
  const later = await order('2026-10-25T01:30:00.000Z', 100000);
  await processLateOrders(new Date('2026-10-25T01:00:00.000Z'));
  assert.equal((await stored(earlier))?.totalMinor, 85000);
  assert.equal((await stored(later))?.discountMinor, 0);
  await processLateOrders(new Date('2026-10-25T01:30:00.001Z'));
  assert.equal((await stored(later))?.totalMinor, 85000);
});
test('late filter and dashboard count metadata without losing stage counts', async () => {
  const id = await order();
  await processLateOrders(now);
  const filtered = await getAdminOrders({ status: 'LATE' }, authorize);
  assert.ok(
    filtered.orders.some(
      (row) => row.id === id && row.status === 'NEW' && row.lateDiscountAt,
    ),
  );
  assert.ok(
    filtered.orders.every(
      (row) =>
        row.lateDiscountAt && !['COMPLETED', 'CANCELLED'].includes(row.status),
    ),
  );
  const dashboard = await getAdminDashboard({
    now: DateTime.fromJSDate(now),
    authorize,
  });
  assert.ok(dashboard.counts.LATE! > 0);
  assert.ok(dashboard.counts.NEW > 0);
});

test('dashboard revenue includes the final discounted amount for a staff-first completion', async () => {
  const clock = DateTime.fromJSDate(now);
  const before = await getAdminDashboard({ now: clock, authorize });
  const id = await order();
  await db.orm.public.Order.where({ id }).updateAll({ status: 'READY' });
  await changeOrderStatus(
    { orderId: id, currentStatus: 'READY', targetStatus: 'COMPLETED' },
    authorize,
    now,
  );
  const after = await getAdminDashboard({ now: clock, authorize });
  assert.equal(after.todayRevenueMinor - before.todayRevenueMinor, 85008);
  assert.equal(after.counts.todayCompleted - before.counts.todayCompleted, 1);
});

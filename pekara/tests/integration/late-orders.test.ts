import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { db } from '../../src/prisma/db.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
import { processLateOrders } from '../../src/server/services/process-late-orders.ts';
import { changeOrderStatus } from '../../src/server/services/change-order-status.ts';
const ids: string[] = [];
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
    unitPriceMinor: totalMinor,
    quantity: 1,
    subtotalMinor: totalMinor,
  });
  return result.orderId;
}
after(async () => {
  if (ids.length)
    await db.orm.public.Order.where((o) => o.id.in(ids)).deleteAll();
  await db.close();
});
test('parallel workers discount once, record one history entry and preserve item snapshots', async () => {
  const id = await order();
  const before = await db.orm.public.OrderItem.where({ orderId: id }).all();
  await Promise.all(Array.from({ length: 4 }, () => processLateOrders(now)));
  await processLateOrders(now);
  const stored = await db.orm.public.Order.include('statusHistory')
    .where({ id })
    .first();
  assert.equal(stored?.status, 'LATE');
  assert.equal(stored?.originalTotalMinor, 100010);
  assert.equal(stored?.discountMinor, 15002);
  assert.equal(stored?.totalMinor, 85008);
  assert.equal(Date.parse(stored!.lateDiscountAt!), now.getTime());
  assert.equal(
    stored?.statusHistory.filter((h) => h.toStatus === 'LATE').length,
    1,
  );
  assert.deepEqual(
    await db.orm.public.OrderItem.where({ orderId: id }).all(),
    before,
  );
  await changeOrderStatus(
    { orderId: id, currentStatus: 'LATE', targetStatus: 'COMPLETED' },
    authorize,
  );
  await processLateOrders(now);
  assert.equal(
    (await db.orm.public.Order.where({ id }).first())?.totalMinor,
    85008,
  );
});
test('terminal orders, exact pickup boundary and future instants remain untouched', async () => {
  const completed = await order();
  const cancelled = await order();
  const boundary = await order(now.toISOString());
  const future = await order('2026-11-25T13:30:00.001Z');
  await db.orm.public.Order.where({ id: completed }).update({
    status: 'COMPLETED',
  });
  await db.orm.public.Order.where({ id: cancelled }).update({
    status: 'CANCELLED',
  });
  await processLateOrders(now);
  for (const id of [completed, cancelled, boundary, future]) {
    const stored = await db.orm.public.Order.where({ id }).first();
    assert.equal(stored?.discountMinor, 0);
    assert.equal(stored?.originalTotalMinor, null);
    assert.notEqual(stored?.status, 'LATE');
  }
});
test('a staff/worker race cannot overwrite a terminal status or duplicate history', async () => {
  const id = await order();
  await db.orm.public.Order.where({ id }).update({ status: 'READY' });
  await Promise.allSettled([
    processLateOrders(now),
    changeOrderStatus(
      { orderId: id, currentStatus: 'READY', targetStatus: 'COMPLETED' },
      authorize,
    ),
  ]);
  const stored = await db.orm.public.Order.include('statusHistory')
    .where({ id })
    .first();
  assert.ok(stored?.status === 'LATE' || stored?.status === 'COMPLETED');
  assert.ok(
    stored.statusHistory.filter((h) =>
      ['LATE', 'COMPLETED'].includes(h.toStatus),
    ).length === 1,
  );
});

test('DST repeated wall times are compared as separate UTC instants', async () => {
  const earlier = await order('2026-10-25T00:30:00.000Z', 100000);
  const later = await order('2026-10-25T01:30:00.000Z', 100000);
  await processLateOrders(new Date('2026-10-25T01:00:00.000Z'));
  assert.equal(
    (await db.orm.public.Order.where({ id: earlier }).first())?.status,
    'LATE',
  );
  assert.equal(
    (await db.orm.public.Order.where({ id: later }).first())?.status,
    'NEW',
  );
  await processLateOrders(new Date('2026-10-25T01:30:00.001Z'));
  assert.equal(
    (await db.orm.public.Order.where({ id: later }).first())?.totalMinor,
    85000,
  );
});

import 'server-only';
import { db } from '../../prisma/db.ts';
import { toUtcInstant } from '../../lib/datetime.ts';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { calculateLateDiscount } from '../../lib/order-discount.ts';

/** Bounded batches; compare-and-swap serializes workers and staff transitions. */
export async function processLateOrders(now = new Date(), batchSize = 250) {
  const instant = toUtcInstant(now);
  const candidates = await db.orm.public.Order.select(
    'id',
    'status',
    'totalMinor',
    'originalTotalMinor',
    'discountMinor',
    'lateDiscountAt',
  )
    .where((order) =>
      order.status.in(['NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY']),
    )
    .where((order) => order.pickupAt.lt(instant))
    .orderBy([(order) => order.pickupAt.asc(), (order) => order.id.asc()])
    .limit(Math.min(1000, Math.max(1, batchSize)))
    .all();
  let processed = 0;
  for (const order of candidates) {
    const changed = await db.transaction(async (tx) => {
      const original = order.originalTotalMinor ?? order.totalMinor;
      const discount = order.lateDiscountAt
        ? order.discountMinor
        : calculateLateDiscount(original);
      const updated = await tx.orm.public.Order.where({
        id: order.id,
        status: order.status,
        totalMinor: order.totalMinor,
      })
        .where((row) => row.pickupAt.lt(instant))
        .updateAll({
          status: 'LATE',
          originalTotalMinor: original,
          discountMinor: discount,
          totalMinor: original - discount,
          lateDiscountAt: order.lateDiscountAt ?? instant,
          updatedAt: instant,
        });
      if (updated.length !== 1) return false;
      await tx.orm.public.OrderStatusHistory.create({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: 'LATE',
        changedByUserId: null,
        reason:
          'Automatski: propušten termin preuzimanja; popust 15%.' as Varchar<300>,
        createdAt: instant,
      });
      return true;
    });
    if (changed) processed += 1;
  }
  return {
    processed,
    scanned: candidates.length,
    hasMore: candidates.length === Math.min(1000, Math.max(1, batchSize)),
  };
}

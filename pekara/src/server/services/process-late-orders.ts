import 'server-only';
import { db } from '../../prisma/db.ts';
import { toUtcInstant } from '../../lib/datetime.ts';
import { applyOrderLateness, lockOrder } from './order-lateness.ts';

export async function processLateOrders(now = new Date(), batchSize = 250) {
  const instant = toUtcInstant(now);
  const limit = Math.min(1000, Math.max(1, Math.trunc(batchSize) || 250));
  const candidates = await db.orm.public.Order.select('id')
    .where((order) =>
      order.status.in(['NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY']),
    )
    .where({ lateDiscountAt: null })
    .where((order) => order.pickupAt.lt(instant))
    .orderBy([(order) => order.pickupAt.asc(), (order) => order.id.asc()])
    .limit(limit)
    .all();
  let processed = 0;
  for (const candidate of candidates) {
    const changed = await db.transaction(async (tx) => {
      const order = await lockOrder(tx, candidate.id);
      return order ? applyOrderLateness(tx, order, instant) : false;
    });
    if (changed) processed++;
  }
  return {
    processed,
    scanned: candidates.length,
    hasMore: candidates.length === limit,
  };
}

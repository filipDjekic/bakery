import 'server-only';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { ACTIVE_ORDER_STATUSES } from '../../config/order-status.ts';
import { calculateLateDiscount } from '../../lib/order-discount.ts';
import { db, type DatabaseTransaction } from '../../prisma/db.ts';

/** Every worker and staff transition locks the same row before reading it. */
export async function lockOrder(tx: DatabaseTransaction, id: string) {
  await tx.query(
    db.raw
      .sql`SELECT "id" FROM "public"."order" WHERE "id" = ${id}::uuid FOR UPDATE`
      .returnsRow({ id: db.sql.public.order.columns.id })
      .build(),
  );
  return tx.orm.public.Order.where({ id }).first();
}

/** Existing policy: every missed pickup deadline, including customer delay.
 * The timestamp is metadata; it never replaces the preparation stage. */
export async function applyOrderLateness(
  tx: DatabaseTransaction,
  order: NonNullable<Awaited<ReturnType<typeof lockOrder>>>,
  instant: string,
) {
  if (
    !ACTIVE_ORDER_STATUSES.includes(
      order.status as (typeof ACTIVE_ORDER_STATUSES)[number],
    ) ||
    order.lateDiscountAt ||
    Date.parse(order.pickupAt) >= Date.parse(instant)
  )
    return false;
  const original = order.originalTotalMinor ?? order.totalMinor;
  const discount = calculateLateDiscount(original);
  await tx.orm.public.Order.where({ id: order.id }).updateAll({
    originalTotalMinor: original,
    discountMinor: discount,
    totalMinor: original - discount,
    lateDiscountAt: instant,
    updatedAt: instant,
  });
  await tx.orm.public.OrderStatusHistory.create({
    orderId: order.id,
    fromStatus: order.status,
    toStatus: order.status,
    changedByUserId: null,
    reason:
      'Automatski: propušten termin preuzimanja; popust 15%.' as Varchar<300>,
    createdAt: instant,
  });
  return true;
}

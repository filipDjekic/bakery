import 'server-only';
import { db } from '../../prisma/db.ts';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import {
  deliverOrderNotifications,
  type OrderSenders,
} from '../email/delivery-tracking.ts';

/** Bounded recovery with backoff. Rows outside the provider retention window
 * require staff review: an old ambiguous send cannot be deduplicated safely. */
export async function recoverOrderNotifications(
  now = new Date(),
  senders?: OrderSenders,
  deadline = Date.now() + 20_000,
) {
  const query = db.orm.public.OrderNotificationDelivery.where((row) =>
    row.status.in(['PENDING', 'SENDING', 'FAILED']),
  ).where((row) =>
    row.updatedAt.lt(new Date(now.getTime() - 60_000).toISOString()),
  );
  const groups = await Promise.all([
    query
      .where({ lastErrorCode: null })
      .orderBy((row) => row.updatedAt.asc())
      .limit(50)
      .all(),
    query
      .where({ lastErrorCode: 'EMAIL_DELIVERY_FAILED' as Varchar<80> })
      .orderBy((row) => row.updatedAt.asc())
      .limit(50)
      .all(),
  ]);
  const rows = groups.flat();
  let recovered = 0;
  for (const row of rows) {
    if (Date.now() >= deadline) break;
    if (
      row.status === 'SENDING' &&
      row.leaseUntil &&
      Date.parse(row.leaseUntil) > now.getTime()
    )
      continue;
    const expired =
      row.attempts > 0 &&
      now.getTime() - Date.parse(row.createdAt) > 23 * 60 * 60 * 1000;
    if (!row.payload || row.attempts >= 5 || expired) {
      if (
        row.status !== 'FAILED' ||
        row.lastErrorCode !==
          (expired
            ? 'EMAIL_REVIEW_REQUIRED'
            : row.payload
              ? 'EMAIL_ATTEMPTS_EXHAUSTED'
              : 'EMAIL_ORIGINAL_PAYLOAD_UNAVAILABLE')
      )
        await db.orm.public.OrderNotificationDelivery.where({
          id: row.id,
          status: row.status,
          attempts: row.attempts,
          updatedAt: row.updatedAt,
        }).updateAll({
          status: 'FAILED',
          leaseUntil: null,
          lastErrorCode: (expired
            ? 'EMAIL_REVIEW_REQUIRED'
            : row.payload
              ? 'EMAIL_ATTEMPTS_EXHAUSTED'
              : 'EMAIL_ORIGINAL_PAYLOAD_UNAVAILABLE') as Varchar<80>,
        });
      continue;
    }
    if (
      now.getTime() - Date.parse(row.updatedAt) <
      Math.min(3600, 60 * 2 ** row.attempts) * 1000
    )
      continue;
    await deliverOrderNotifications({ orderId: row.orderId }, senders);
    recovered++;
  }
  return { recovered, scanned: rows.length };
}

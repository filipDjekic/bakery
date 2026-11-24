import 'server-only';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { db, type DatabaseTransaction } from '../../prisma/db.ts';
import type { OrderEmailData } from './order-email-data.ts';
import { sendCustomerOrderConfirmation } from './send-customer-order-confirmation.ts';
import { sendBakeryNewOrder } from './send-bakery-new-order.ts';
import { safeError } from '../logging/logger.ts';

export type OrderSenders = {
  sendCustomer: typeof sendCustomerOrderConfirmation;
  sendBakery: typeof sendBakeryNewOrder;
};

export async function recordOrderNotifications(
  tx: DatabaseTransaction,
  data: OrderEmailData,
) {
  const types = [
    data.customerEmail ? 'customer' : null,
    data.bakery.notificationEmail ? 'bakery' : null,
  ].filter((value): value is string => value !== null);
  if (types.length)
    await tx.orm.public.OrderNotificationDelivery.createAll(
      types.map((recipientType) => ({
        orderId: data.orderId,
        recipientType: recipientType as Varchar<16>,
        status: 'PENDING',
        attempts: 0,
      })),
    );
}

/** Awaited by Next after(), never an untracked promise. A lost runtime leaves a
 * durable pending/expired lease for a staff-controlled retry. Delivery is at-least
 * once; the provider idempotency key reduces duplicates within its retention. */
export async function deliverOrderNotifications(
  data: OrderEmailData,
  senders: OrderSenders = {
    sendCustomer: sendCustomerOrderConfirmation,
    sendBakery: sendBakeryNewOrder,
  },
) {
  try {
    const rows = await db.orm.public.OrderNotificationDelivery.where({
      orderId: data.orderId,
    }).all();
    await Promise.all(
      rows.map(async (row) => {
        if (
          row.status === 'SENT' ||
          row.status === 'SKIPPED' ||
          row.attempts >= 5 ||
          (row.status === 'SENDING' &&
            row.leaseUntil &&
            Date.parse(row.leaseUntil) > Date.now())
        )
          return;
        const claimed = await db.orm.public.OrderNotificationDelivery.where({
          id: row.id,
          status: row.status,
          attempts: row.attempts,
          updatedAt: row.updatedAt,
        }).updateAll({
          status: 'SENDING',
          attempts: row.attempts + 1,
          leaseUntil: new Date(Date.now() + 30_000).toISOString(),
          lastErrorCode: null,
        });
        if (claimed.length !== 1) return;
        let outcome: 'sent' | 'skipped' | 'failed' = 'failed';
        try {
          outcome = await (row.recipientType === 'customer'
            ? senders.sendCustomer(data)
            : senders.sendBakery(data));
        } catch {
          /* Record the bounded provider failure below. */
        }
        await db.orm.public.OrderNotificationDelivery.where({
          id: row.id,
          status: 'SENDING',
          attempts: row.attempts + 1,
        }).updateAll({
          status:
            outcome === 'sent'
              ? 'SENT'
              : outcome === 'skipped'
                ? 'SKIPPED'
                : 'FAILED',
          deliveredAt: outcome === 'sent' ? new Date().toISOString() : null,
          leaseUntil: null,
          lastErrorCode:
            outcome === 'failed'
              ? ('EMAIL_DELIVERY_FAILED' as Varchar<80>)
              : null,
        });
      }),
    );
  } catch {
    safeError({
      event: 'email.delivery_tracking.failed',
      orderId: data.orderId,
    });
  }
}

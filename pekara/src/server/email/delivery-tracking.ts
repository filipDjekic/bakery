import 'server-only';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { db, type DatabaseTransaction } from '../../prisma/db.ts';
import type { OrderEmailData } from './order-email-data.ts';
import { sendCustomerOrderConfirmation } from './send-customer-order-confirmation.ts';
import { sendBakeryNewOrder } from './send-bakery-new-order.ts';
import { safeError } from '../logging/logger.ts';
import {
  serializeNotification,
  deserializeNotification,
} from './notification-payload.ts';

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
      await Promise.all(
        types.map(async (recipientType) => {
          let payload: string | null = null;
          try {
            payload = await serializeNotification(data, recipientType);
          } catch {
            safeError({
              event: 'email.snapshot.failed',
              orderId: data.orderId,
            });
          }
          return {
            orderId: data.orderId,
            recipientType: recipientType as Varchar<16>,
            status: payload ? ('PENDING' as const) : ('FAILED' as const),
            attempts: 0,
            payload,
            lastErrorCode: payload
              ? null
              : ('EMAIL_SNAPSHOT_FAILED' as Varchar<80>),
          };
        }),
      ),
    );
}

/** Awaited by Next after(), never an untracked promise. A lost runtime leaves a
 * durable pending/expired lease for a staff-controlled retry. Delivery is at-least
 * once; the provider idempotency key reduces duplicates within its retention. */
export async function deliverOrderNotifications(
  data: Pick<OrderEmailData, 'orderId'>,
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
          row.attempts > 0 &&
          Date.now() - Date.parse(row.createdAt) > 23 * 60 * 60 * 1000 &&
          row.status !== 'SENT' &&
          row.status !== 'SKIPPED' &&
          !(
            row.status === 'SENDING' &&
            row.leaseUntil &&
            Date.parse(row.leaseUntil) > Date.now()
          )
        ) {
          await db.orm.public.OrderNotificationDelivery.where({
            id: row.id,
            status: row.status,
            attempts: row.attempts,
            updatedAt: row.updatedAt,
          }).updateAll({
            status: 'FAILED',
            leaseUntil: null,
            lastErrorCode: 'EMAIL_REVIEW_REQUIRED' as Varchar<80>,
          });
          return;
        }
        // A fifth lost lease must become visibly exhausted, not stay SENDING.
        if (
          row.status === 'SENDING' &&
          row.attempts >= 5 &&
          (!row.leaseUntil || Date.parse(row.leaseUntil) <= Date.now())
        ) {
          await db.orm.public.OrderNotificationDelivery.where({
            id: row.id,
            status: row.status,
            attempts: row.attempts,
            updatedAt: row.updatedAt,
          }).updateAll({
            status: 'FAILED',
            leaseUntil: null,
            lastErrorCode: 'EMAIL_ATTEMPTS_EXHAUSTED' as Varchar<80>,
          });
          return;
        }
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
          if (!row.payload) throw new Error('Original payload unavailable');
          const frozen = deserializeNotification(row.payload);
          outcome = await (row.recipientType === 'customer'
            ? senders.sendCustomer(frozen)
            : senders.sendBakery(frozen));
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
              ? ((row.payload
                  ? 'EMAIL_DELIVERY_FAILED'
                  : 'EMAIL_ORIGINAL_PAYLOAD_UNAVAILABLE') as Varchar<80>)
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

import 'server-only';

import { randomUUID } from 'node:crypto';
import { createElement } from 'react';

import { NewOrderNotificationEmail } from '../../emails/new-order-notification.tsx';
import { logEvent, OBSERVABILITY_EVENTS } from '../logging/events.ts';
import type { EmailService } from './email-service.ts';
import {
  formatOrderMoney,
  formatOrderPickup,
  type OrderEmailData,
} from './order-email-data.ts';
import { getEmailService } from './resend-client.ts';

export async function sendBakeryNewOrder(
  order: OrderEmailData,
  emailService?: EmailService,
): Promise<'sent' | 'skipped' | 'failed'> {
  if (!order.bakery.notificationEmail) return 'skipped';

  const requestId = randomUUID();
  try {
    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error('APP_URL is not configured.');
    const adminOrderUrl = new URL(
      `/admin/orders/${encodeURIComponent(order.orderId)}`,
      appUrl,
    ).toString();
    const delivery = await (emailService ?? getEmailService()).send({
      to: order.bakery.notificationEmail,
      subject: `Nova porudžbina ${order.orderNumber}`,
      react: createElement(NewOrderNotificationEmail, {
        orderNumber: order.orderNumber,
        pickupLabel: formatOrderPickup(order.pickupAt, order.timezone),
        totalLabel: formatOrderMoney(order.totalMinor, order.currencyCode),
        adminOrderUrl,
      }),
    });
    logEvent(
      {
        requestId,
        event: OBSERVABILITY_EVENTS.bakeryEmailSent,
        route: 'post-commit:order-email',
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        deliveryId: delivery.id,
        recipientType: 'bakery',
      },
      'info',
    );
    return 'sent';
  } catch {
    logEvent(
      {
        requestId,
        event: OBSERVABILITY_EVENTS.bakeryEmailFailed,
        route: 'post-commit:order-email',
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        errorCode: 'EMAIL_DELIVERY_FAILED',
        recipientType: 'bakery',
      },
      'error',
    );
    return 'failed';
  }
}

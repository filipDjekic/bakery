import 'server-only';

import { randomUUID } from 'node:crypto';
import { createElement } from 'react';

import { OrderConfirmationEmail } from '../../emails/order-confirmation.tsx';
import { logEvent, OBSERVABILITY_EVENTS } from '../logging/events.ts';
import type { EmailService } from './email-service.ts';
import {
  formatOrderMoney,
  emailTotalLabels,
  formatOrderPickup,
  type OrderEmailData,
} from './order-email-data.ts';
import { getEmailService } from './resend-client.ts';

export async function sendCustomerOrderConfirmation(
  order: OrderEmailData,
  emailService?: EmailService,
): Promise<'sent' | 'skipped' | 'failed'> {
  if (!order.customerEmail) return 'skipped';

  if (!emailService && process.env.EMAIL_ENABLED === 'false') return 'skipped';
  const requestId = randomUUID();
  try {
    const delivery = await (emailService ?? getEmailService()).send(
      order.preparedMessage ?? buildCustomerOrderConfirmation(order),
    );
    logEvent(
      {
        requestId,
        event: OBSERVABILITY_EVENTS.customerEmailSent,
        route: 'post-commit:order-email',
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        deliveryId: delivery.id,
        recipientType: 'customer',
      },
      'info',
    );
    return 'sent';
  } catch {
    logEvent(
      {
        requestId,
        event: OBSERVABILITY_EVENTS.customerEmailFailed,
        route: 'post-commit:order-email',
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        errorCode: 'EMAIL_DELIVERY_FAILED',
        recipientType: 'customer',
      },
      'error',
    );
    return 'failed';
  }
}

export function buildCustomerOrderConfirmation(order: OrderEmailData) {
  if (!order.customerEmail) throw new Error('Missing customer recipient');
  return {
    idempotencyKey: `order/${order.orderId}/customer/v2`,
    to: order.customerEmail,
    subject: `Potvrda porudžbine ${order.orderNumber}`,
    react: createElement(OrderConfirmationEmail, {
      ...emailTotalLabels(order),
      bakeryName: order.bakery.name,
      bakeryAddress: order.bakery.address,
      bakeryPhone: order.bakery.phone,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      pickupLabel: formatOrderPickup(order.pickupAt, order.timezone),
      totalLabel: formatOrderMoney(order.totalMinor, order.currencyCode),
      orderStatusUrl: new URL(
        `/porudzbina/${encodeURIComponent(order.orderId)}`,
        process.env.APP_URL ?? 'http://localhost:3000',
      ).toString(),
      items: order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        unitLabel: item.unitLabel ?? 'komad',
        subtotalLabel: formatOrderMoney(item.subtotalMinor, order.currencyCode),
      })),
    }),
  };
}

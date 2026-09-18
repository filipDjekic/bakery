import 'server-only';

import { randomUUID } from 'node:crypto';
import { createElement } from 'react';

import { OrderConfirmationEmail } from '../../emails/order-confirmation.tsx';
import { logEvent, OBSERVABILITY_EVENTS } from '../logging/events.ts';
import type { EmailService } from './email-service.ts';
import {
  formatOrderMoney,
  formatOrderPickup,
  type OrderEmailData,
} from './order-email-data.ts';
import { getEmailService } from './resend-client.ts';

export async function sendCustomerOrderConfirmation(
  order: OrderEmailData,
  emailService?: EmailService,
): Promise<'sent' | 'skipped' | 'failed'> {
  if (!order.customerEmail) return 'skipped';

  const requestId = randomUUID();
  try {
    const delivery = await (emailService ?? getEmailService()).send({
      to: order.customerEmail,
      subject: `Potvrda porudžbine ${order.orderNumber}`,
      react: createElement(OrderConfirmationEmail, {
        bakeryName: order.bakery.name,
        bakeryAddress: order.bakery.address,
        bakeryPhone: order.bakery.phone,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        pickupLabel: formatOrderPickup(order.pickupAt, order.timezone),
        totalLabel: formatOrderMoney(order.totalMinor, order.currencyCode),
        items: order.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          subtotalLabel: formatOrderMoney(
            item.subtotalMinor,
            order.currencyCode,
          ),
        })),
      }),
    });
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

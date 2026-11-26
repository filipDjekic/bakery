import 'server-only';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { render } from 'react-email';
import type { OrderEmailData } from './order-email-data.ts';
import { buildCustomerOrderConfirmation } from './send-customer-order-confirmation.ts';
import { buildBakeryNewOrder } from './send-bakery-new-order.ts';

/** Freeze rendered HTML, sender, recipient and subject, not just mutable IDs.
 * Replays are independent of prices, settings, templates and environment changes. */
export async function serializeNotification(
  data: OrderEmailData,
  recipient: string,
) {
  const message =
    recipient === 'customer'
      ? buildCustomerOrderConfirmation(data)
      : buildBakeryNewOrder(data);
  const payload = {
    to: message.to,
    subject: message.subject,
    from: process.env.EMAIL_FROM ?? '',
    html: await render(message.react),
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  return JSON.stringify({
    data,
    message: {
      ...payload,
      idempotencyKey: `order/${data.orderId}/${recipient}/v2/${hash}`,
    },
  });
}

export function deserializeNotification(payload: string): OrderEmailData {
  const stored = JSON.parse(payload);
  if (
    !stored?.data?.orderId ||
    typeof stored.message?.html !== 'string' ||
    typeof stored.message?.idempotencyKey !== 'string'
  )
    throw new Error('Invalid notification snapshot');
  return {
    ...stored.data,
    preparedMessage: { ...stored.message, react: createElement('span') },
  };
}

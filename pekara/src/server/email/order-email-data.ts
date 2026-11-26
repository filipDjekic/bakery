import 'server-only';

import { formatDateTime } from '../../lib/datetime.ts';

import type { OrderItemSnapshot } from '../repositories/orders.ts';
import type { TransactionalEmail } from './email-service.ts';

export type OrderEmailData = {
  preparedMessage?: TransactionalEmail;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  pickupAt: string;
  totalMinor: number;
  originalTotalMinor?: number;
  discountMinor?: number;
  currencyCode: string;
  timezone: string;
  items: OrderItemSnapshot[];
  bakery: {
    name: string;
    address: string;
    phone: string;
    notificationEmail: string | null;
  };
};

export function emailTotalLabels(order: OrderEmailData) {
  const sum = order.items.reduce(
    (total, item) => total + item.subtotalMinor,
    0,
  );
  const original = order.originalTotalMinor ?? sum;
  const discount = order.discountMinor ?? original - order.totalMinor;
  if (
    !Number.isSafeInteger(original) ||
    !Number.isSafeInteger(discount) ||
    original !== sum ||
    discount < 0 ||
    original - discount !== order.totalMinor
  )
    throw new Error('Inconsistent email totals');
  return discount > 0
    ? {
        originalTotalLabel: formatOrderMoney(original, order.currencyCode),
        discountLabel: formatOrderMoney(discount, order.currencyCode),
      }
    : {};
}

export function formatOrderMoney(
  minorUnits: number,
  currencyCode: string,
): string {
  return new Intl.NumberFormat('sr-Latn-RS', {
    style: 'currency',
    currency: currencyCode,
  }).format(minorUnits / 100);
}

export function formatOrderPickup(pickupAt: string, timezone: string): string {
  return formatDateTime(pickupAt, timezone);
}

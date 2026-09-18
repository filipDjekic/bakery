import 'server-only';

import { DateTime } from 'luxon';

import type { OrderItemSnapshot } from '../repositories/orders.ts';

export type OrderEmailData = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  pickupAt: string;
  totalMinor: number;
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
  return DateTime.fromISO(pickupAt, { zone: 'utc' })
    .setZone(timezone)
    .setLocale('sr-Latn')
    .toFormat('dd. LLLL yyyy. HH:mm');
}

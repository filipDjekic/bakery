import 'server-only';

import { z } from 'zod';

import { db } from '../../prisma/db.ts';
import type { PublicOrderStatus } from '../../types/order.ts';

export type PublicOrderConfirmation = {
  orderId: string;
  orderNumber: string;
  status: PublicOrderStatus;
  pickupAt: string;
  totalMinor: number;
  currencyCode: string;
  items: Array<{
    id: string;
    productName: string;
    unitPriceMinor: number;
    quantity: number;
    subtotalMinor: number;
  }>;
  bakery: {
    name: string;
    phone: string;
    address: string;
    timezone: string;
  };
};

export async function getPublicOrderConfirmation(
  orderId: string,
): Promise<PublicOrderConfirmation | null> {
  if (!z.string().uuid().safeParse(orderId).success) {
    return null;
  }

  const [order, settings] = await Promise.all([
    db.orm.public.Order.include('items', (items) =>
      items.orderBy((item) => item.id.asc()),
    )
      .where({ id: orderId })
      .first(),
    db.orm.public.BakerySettings.select(
      'bakeryName',
      'phone',
      'address',
      'timezone',
    )
      .where({ id: 'default' })
      .first(),
  ]);

  if (!order || !settings) {
    return null;
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    pickupAt: new Date(order.pickupAt).toISOString(),
    totalMinor: order.totalMinor,
    currencyCode: order.currencyCode,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      unitPriceMinor: item.unitPriceMinor,
      quantity: item.quantity,
      subtotalMinor: item.subtotalMinor,
    })),
    bakery: {
      name: settings.bakeryName,
      phone: settings.phone,
      address: settings.address,
      timezone: settings.timezone,
    },
  };
}

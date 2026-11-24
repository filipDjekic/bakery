import 'server-only';
import { AppError } from '../errors/app-error.ts';
import { z } from 'zod';
import { db } from '../../prisma/db.ts';
import { requireStaff } from '../auth/authorization.ts';
import { getPickupBakerySettings } from '../repositories/bakery-settings.ts';
import { deliverOrderNotifications } from '../email/delivery-tracking.ts';
export async function retryOrderNotifications(
  id: string,
  authorize: () => Promise<unknown> = requireStaff,
) {
  await authorize();
  if (!z.string().uuid().safeParse(id).success)
    throw new AppError({ code: 'VALIDATION_ERROR' });
  const order = await db.orm.public.Order.include('items')
    .where({ id })
    .first();
  if (!order) throw new AppError({ code: 'NOT_FOUND' });
  const settings = await getPickupBakerySettings();
  await deliverOrderNotifications({
    orderId: id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail ?? undefined,
    pickupAt: order.pickupAt,
    totalMinor: order.totalMinor,
    currencyCode: order.currencyCode,
    timezone: settings.timezone,
    items: order.items.map((item) => ({
      ...item,
      productId: item.productId ?? '',
    })),
    bakery: {
      name: settings.bakeryName,
      address: settings.address,
      phone: settings.phone,
      notificationEmail: settings.notificationEmail,
    },
  });
  const deliveries = await db.orm.public.OrderNotificationDelivery.where({
    orderId: id,
  }).all();
  return {
    failed: deliveries.filter((row) => row.status === 'FAILED').length,
    pending: deliveries.filter((row) =>
      ['PENDING', 'SENDING'].includes(row.status),
    ).length,
  };
}

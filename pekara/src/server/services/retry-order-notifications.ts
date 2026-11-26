import 'server-only';
import { AppError } from '../errors/app-error.ts';
import { z } from 'zod';
import { db } from '../../prisma/db.ts';
import { requireStaff } from '../auth/authorization.ts';
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
  await deliverOrderNotifications({ orderId: id });
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

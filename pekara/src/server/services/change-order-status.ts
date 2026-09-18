import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { canTransitionOrderStatus } from '../../config/order-status.ts';
import { db } from '../../prisma/db.ts';
import { orderStatusChangeSchema } from '../../validation/order.ts';
import { requireStaff } from '../auth/authorization.ts';
import { AppError } from '../errors/app-error.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength) throw new AppError({ code: 'VALIDATION_ERROR' });
  return value as Varchar<N>;
}

export async function changeOrderStatus(
  input: unknown,
  authorize: typeof requireStaff = requireStaff,
) {
  const user = await authorize();
  const parsed = orderStatusChangeSchema.safeParse(input);
  if (!parsed.success) throw new AppError({ code: 'VALIDATION_ERROR' });
  const value = parsed.data;

  return db.transaction(async (tx) => {
    const order = await tx.orm.public.Order.select('id', 'status')
      .where({ id: value.orderId })
      .first();
    if (!order) throw new AppError({ code: 'NOT_FOUND' });
    if (
      order.status !== value.currentStatus ||
      !canTransitionOrderStatus(order.status, value.targetStatus)
    ) {
      throw new AppError({ code: 'CONFLICT' });
    }

    await tx.orm.public.Order.where({
      id: value.orderId,
      status: value.currentStatus,
    }).update({
      status: value.targetStatus,
      cancellationReason:
        value.targetStatus === 'CANCELLED'
          ? varchar(value.cancellationReason ?? '', 300)
          : null,
    });
    await tx.orm.public.OrderStatusHistory.create({
      orderId: value.orderId,
      fromStatus: value.currentStatus,
      toStatus: value.targetStatus,
      changedByUserId: user.id,
      reason: value.cancellationReason
        ? varchar(value.cancellationReason, 300)
        : null,
    });
    return value.targetStatus;
  });
}

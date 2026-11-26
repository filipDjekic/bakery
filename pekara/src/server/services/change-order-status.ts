import 'server-only';

import { randomUUID } from 'node:crypto';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { canTransitionOrderStatus } from '../../config/order-status.ts';
import { db } from '../../prisma/db.ts';
import { orderStatusChangeSchema } from '../../validation/order.ts';
import { requireStaff } from '../auth/authorization.ts';
import { AppError } from '../errors/app-error.ts';
import { applyOrderLateness, lockOrder } from './order-lateness.ts';
import { reportUnexpectedError } from '../errors/sentry.ts';
import {
  errorCodeFor,
  logEvent,
  OBSERVABILITY_EVENTS,
} from '../logging/events.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength)
    throw new AppError({ code: 'VALIDATION_ERROR' });
  return value as Varchar<N>;
}

export async function changeOrderStatus(
  input: unknown,
  authorize: typeof requireStaff = requireStaff,
  now?: Date,
) {
  const requestId = randomUUID();
  const startedAt = performance.now();
  let userId: string | undefined;
  let orderId: string | undefined;
  let orderNumber: string | undefined;

  try {
    const user = await authorize();
    userId = user.id;
    const parsed = orderStatusChangeSchema.safeParse(input);
    if (!parsed.success) throw new AppError({ code: 'VALIDATION_ERROR' });
    const value = parsed.data;
    orderId = value.orderId;

    const targetStatus = await db.transaction(async (tx) => {
      const order = await lockOrder(tx, value.orderId);
      if (!order) throw new AppError({ code: 'NOT_FOUND' });
      orderNumber = order.orderNumber;
      if (
        order.status !== value.currentStatus ||
        !canTransitionOrderStatus(order.status, value.targetStatus)
      ) {
        throw new AppError({ code: 'CONFLICT' });
      }

      const instant = (now ?? new Date()).toISOString();
      const markedLate = await applyOrderLateness(tx, order, instant);
      const updated = await tx.orm.public.Order.where({
        id: value.orderId,
        status: value.currentStatus,
      }).updateAll({
        status: value.targetStatus,
        updatedAt: instant,
        ...(value.targetStatus === 'READY' ? { readyAt: instant } : {}),
        cancellationReason:
          value.targetStatus === 'CANCELLED'
            ? varchar(value.cancellationReason ?? '', 300)
            : null,
      });
      if (updated.length !== 1) throw new AppError({ code: 'CONFLICT' });
      await tx.orm.public.OrderStatusHistory.create({
        orderId: value.orderId,
        fromStatus: value.currentStatus,
        toStatus: value.targetStatus,
        changedByUserId: user.id,
        createdAt: markedLate
          ? new Date(Date.parse(instant) + 1).toISOString()
          : instant,
        reason: value.cancellationReason
          ? varchar(value.cancellationReason, 300)
          : null,
      });
      return value.targetStatus;
    });

    logEvent(
      {
        requestId,
        event: OBSERVABILITY_EVENTS.orderStatusChanged,
        route: 'server-action:update-order-status',
        orderId,
        orderNumber,
        userId,
        durationMs: Math.round(performance.now() - startedAt),
      },
      'info',
    );
    return targetStatus;
  } catch (error) {
    logEvent(
      {
        requestId,
        event: OBSERVABILITY_EVENTS.orderStatusChangeFailed,
        route: 'server-action:update-order-status',
        orderId,
        orderNumber,
        userId,
        durationMs: Math.round(performance.now() - startedAt),
        errorCode: errorCodeFor(error),
      },
      'error',
    );
    reportUnexpectedError(error, {
      requestId,
      event: OBSERVABILITY_EVENTS.orderStatusChangeFailed,
      route: 'server-action:update-order-status',
      orderId,
      userId,
    });
    throw error;
  }
}

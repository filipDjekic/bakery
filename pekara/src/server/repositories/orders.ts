import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../prisma/db.ts';
import type { OrderConfirmationDto } from '../../types/order.ts';

export type OrderItemSnapshot = {
  productId: string;
  productName: string;
  unitPriceMinor: number;
  quantity: number;
  subtotalMinor: number;
};

export type PersistOrderInput = {
  orderNumber: string;
  idempotencyKey: string;
  payloadHash: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  note?: string;
  pickupAt: string;
  currencyCode: string;
  totalMinor: number;
  items: OrderItemSnapshot[];
};

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength) {
    throw new Error(`Value exceeds varchar(${maxLength}).`);
  }

  return value as Varchar<N>;
}

function toConfirmation(order: {
  id: string;
  orderNumber: string;
  status: OrderConfirmationDto['status'];
  pickupAt: string;
  totalMinor: number;
  currencyCode: string;
}): OrderConfirmationDto {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    pickupAt: new Date(order.pickupAt).toISOString(),
    totalMinor: order.totalMinor,
    currencyCode: order.currencyCode,
  };
}

export async function findOrderByIdempotencyKey(
  idempotencyKey: string,
): Promise<{
  payloadHash: string;
  value: OrderConfirmationDto;
} | null> {
  const order = await db.orm.public.Order.select(
    'id',
    'orderNumber',
    'status',
    'pickupAt',
    'totalMinor',
    'currencyCode',
    'payloadHash',
  )
    .where({ idempotencyKey })
    .first();

  return order
    ? { payloadHash: order.payloadHash, value: toConfirmation(order) }
    : null;
}

export async function persistOrder(
  input: PersistOrderInput,
): Promise<OrderConfirmationDto> {
  return db.transaction(async (tx) => {
    const order = await tx.orm.public.Order.select(
      'id',
      'orderNumber',
      'status',
      'pickupAt',
      'totalMinor',
      'currencyCode',
    ).create({
      orderNumber: varchar(input.orderNumber, 32),
      idempotencyKey: input.idempotencyKey,
      payloadHash: input.payloadHash,
      status: 'NEW',
      customerName: varchar(input.customerName, 100),
      customerPhone: varchar(input.customerPhone, 20),
      customerEmail: input.customerEmail
        ? varchar(input.customerEmail, 254)
        : null,
      note: input.note ? varchar(input.note, 500) : null,
      pickupAt: input.pickupAt,
      currencyCode: varchar(input.currencyCode, 3),
      subtotalMinor: input.totalMinor,
      totalMinor: input.totalMinor,
      cancellationReason: null,
    });

    await tx.orm.public.OrderItem.createAll(
      input.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: varchar(item.productName, 120),
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        subtotalMinor: item.subtotalMinor,
      })),
    );

    await tx.orm.public.OrderStatusHistory.create({
      orderId: order.id,
      fromStatus: null,
      toStatus: 'NEW',
      changedByUserId: null,
      reason: null,
    });

    return toConfirmation(order);
  });
}

function hasConstraint(error: unknown, constraintName: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = error.cause as { code?: unknown } | undefined;
  return cause?.code === '23505' && error.message.includes(constraintName);
}

export function isIdempotencyKeyConflict(error: unknown): boolean {
  return hasConstraint(error, 'order_idempotencyKey_key');
}

export function isOrderNumberConflict(error: unknown): boolean {
  return hasConstraint(error, 'order_orderNumber_key');
}

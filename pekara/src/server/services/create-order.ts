import 'server-only';

import { DateTime } from 'luxon';
import type { ZodIssue } from 'zod';

import { ORDER_LIMITS } from '../../config/limits.ts';
import { generateOrderNumber } from '../../lib/order-number.ts';
import { createCheckoutPayloadHash } from '../../lib/payload-hash.ts';
import type {
  OrderConfirmationDto,
  OrderErrorCode,
} from '../../types/order.ts';
import {
  checkoutRequestSchema,
  type CheckoutRequest,
} from '../../validation/checkout.ts';
import { getPickupBakerySettings } from '../repositories/bakery-settings.ts';
import { getBusinessHoursForWeekday } from '../repositories/business-hours.ts';
import {
  isOrderNumberConflict,
  persistOrder,
  type OrderItemSnapshot,
} from '../repositories/orders.ts';
import { getProductsForOrder } from '../repositories/products.ts';
import { generatePickupSlots } from './pickup-slots.ts';

export class OrderDomainError extends Error {
  readonly code: OrderErrorCode;
  readonly issues?: ZodIssue[];

  constructor(code: OrderErrorCode, message: string, issues?: ZodIssue[]) {
    super(message);
    this.name = 'OrderDomainError';
    this.code = code;
    this.issues = issues;
  }
}

type CreateOrderOptions = {
  now?: DateTime;
  payloadHash?: string;
};

export async function createOrder(
  input: unknown,
  { now = DateTime.utc(), payloadHash }: CreateOrderOptions = {},
): Promise<OrderConfirmationDto> {
  const parsed = checkoutRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw new OrderDomainError(
      'VALIDATION_ERROR',
      'Podaci porudžbine nisu validni.',
      parsed.error.issues,
    );
  }

  const request: CheckoutRequest = parsed.data;
  const settings = await getPickupBakerySettings();

  if (!settings.orderAcceptingEnabled) {
    throw new OrderDomainError(
      'ORDERS_DISABLED',
      'Primanje porudžbina je trenutno isključeno.',
    );
  }

  const pickupAt = DateTime.fromISO(request.pickupAt, { setZone: true });

  if (!pickupAt.isValid) {
    throw new OrderDomainError(
      'INVALID_PICKUP_SLOT',
      'Izabrani termin preuzimanja nije validan.',
    );
  }

  const localPickup = pickupAt.setZone(settings.timezone);
  const pickupDate = localPickup.toISODate();

  if (!pickupDate) {
    throw new OrderDomainError(
      'INVALID_PICKUP_SLOT',
      'Izabrani termin preuzimanja nije validan.',
    );
  }

  const businessHours = await getBusinessHoursForWeekday(
    settings.id,
    localPickup.weekday,
  );
  const validSlots = generatePickupSlots({
    date: pickupDate,
    settings,
    businessHours,
    now,
  });
  const pickupInstant = pickupAt.toUTC().toISO({ suppressMilliseconds: false });

  if (
    !pickupInstant ||
    !validSlots.some((slot) => slot.value === pickupInstant)
  ) {
    throw new OrderDomainError(
      'INVALID_PICKUP_SLOT',
      'Izabrani termin više nije dostupan.',
    );
  }

  const products = await getProductsForOrder(
    request.items.map((item) => item.productId),
  );
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const snapshots: OrderItemSnapshot[] = [];
  let totalMinor = 0;

  for (const item of request.items) {
    const product = productsById.get(item.productId);

    if (
      !product ||
      !product.isActive ||
      !product.isAvailable ||
      !product.categoryIsActive
    ) {
      throw new OrderDomainError(
        'PRODUCT_UNAVAILABLE',
        'Jedan ili više proizvoda više nisu dostupni.',
      );
    }

    if (
      item.displayPriceMinor !== undefined &&
      item.displayPriceMinor !== product.priceMinor
    ) {
      throw new OrderDomainError(
        'PRICE_CHANGED',
        'Cena jednog ili više proizvoda je promenjena.',
      );
    }

    const subtotalMinor = product.priceMinor * item.quantity;
    totalMinor += subtotalMinor;
    snapshots.push({
      productId: product.id,
      productName: product.name,
      unitPriceMinor: product.priceMinor,
      quantity: item.quantity,
      subtotalMinor,
    });
  }

  if (
    !Number.isSafeInteger(totalMinor) ||
    totalMinor > ORDER_LIMITS.maximumTotalMinor
  ) {
    throw new OrderDomainError(
      'CONFLICT',
      'Ukupan iznos porudžbine nije validan.',
    );
  }

  const canonicalHash = payloadHash ?? createCheckoutPayloadHash(request);

  for (
    let attempt = 0;
    attempt < ORDER_LIMITS.orderNumberAttempts;
    attempt += 1
  ) {
    try {
      return await persistOrder({
        orderNumber: generateOrderNumber(now, settings.timezone),
        idempotencyKey: request.idempotencyKey,
        payloadHash: canonicalHash,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        customerEmail: request.customerEmail,
        note: request.note,
        pickupAt: pickupInstant,
        currencyCode: settings.currencyCode,
        totalMinor,
        items: snapshots,
      });
    } catch (error) {
      if (
        !isOrderNumberConflict(error) ||
        attempt === ORDER_LIMITS.orderNumberAttempts - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error('Order number retry loop completed unexpectedly.');
}

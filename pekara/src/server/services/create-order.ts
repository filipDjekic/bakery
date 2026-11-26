import 'server-only';

import { DateTime } from 'luxon';
import type { ZodIssue } from 'zod';

import {
  recordOrderNotifications,
  deliverOrderNotifications,
} from '../email/delivery-tracking.ts';
import { safeError } from '../logging/logger.ts';

import { db } from '../../prisma/db.ts';
import { lockOrderInputs } from '../repositories/order-locks.ts';

import { ORDER_LIMITS } from '../../config/limits.ts';
import { calculateMoneyTotalMinor } from '../../lib/money.ts';
import { generateOrderNumber } from '../../lib/order-number.ts';
import { createCheckoutPayloadHash } from '../../lib/payload-hash.ts';
import type {
  OrderConflictDetails,
  OrderConfirmationDto,
  OrderErrorCode,
} from '../../types/order.ts';
import {
  checkoutRequestSchema,
  type CheckoutRequest,
} from '../../validation/checkout.ts';
import { sendBakeryNewOrder } from '../email/send-bakery-new-order.ts';
import { sendCustomerOrderConfirmation } from '../email/send-customer-order-confirmation.ts';
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
  readonly details?: OrderConflictDetails;

  constructor(
    code: OrderErrorCode,
    message: string,
    issues?: ZodIssue[],
    details?: OrderConflictDetails,
  ) {
    super(message);
    this.name = 'OrderDomainError';
    this.code = code;
    this.issues = issues;
    this.details = details;
  }
}

type CreateOrderOptions = {
  now?: DateTime | (() => DateTime);
  payloadHash?: string;
  scheduleNotifications?: (callback: () => Promise<void>) => void;
  notifications?: {
    sendCustomer: typeof sendCustomerOrderConfirmation;
    sendBakery: typeof sendBakeryNewOrder;
  };
};

export async function createOrder(
  input: unknown,
  {
    now = () => DateTime.utc(),
    payloadHash,
    scheduleNotifications,
    notifications = {
      sendCustomer: sendCustomerOrderConfirmation,
      sendBakery: sendBakeryNewOrder,
    },
  }: CreateOrderOptions = {},
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
  const canonicalHash = payloadHash ?? createCheckoutPayloadHash(request);

  for (
    let attempt = 0;
    attempt < ORDER_LIMITS.orderNumberAttempts;
    attempt += 1
  ) {
    try {
      const { confirmation, emailData } = await db.transaction(async (tx) => {
        await lockOrderInputs(
          tx,
          request.items.map((item) => item.productId),
        );
        // Validate against the time after lock waits, not request arrival time.
        const currentTime = typeof now === 'function' ? now() : now;
        const settings = await getPickupBakerySettings(tx);

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
          tx,
        );
        const validSlots = generatePickupSlots({
          date: pickupDate,
          settings,
          businessHours,
          now: currentTime,
        });
        const pickupInstant = pickupAt
          .toUTC()
          .toISO({ suppressMilliseconds: false });

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
          tx,
        );
        const productsById = new Map(
          products.map((product) => [product.id, product]),
        );
        const snapshots: OrderItemSnapshot[] = [];
        const unavailableItems: OrderConflictDetails['items'] = [];
        const changedPriceItems: OrderConflictDetails['items'] = [];

        for (const item of request.items) {
          const product = productsById.get(item.productId);
          const unitChanged =
            product &&
            item.displayUnitLabel !== undefined &&
            (item.displayUnitLabel ?? 'komad') !==
              (product.unitLabel ?? 'komad');

          if (
            !product ||
            !product.isActive ||
            !product.isAvailable ||
            !product.categoryIsActive ||
            unitChanged
          ) {
            unavailableItems.push({
              productId: item.productId,
              productName: unitChanged
                ? `${product.name} — jedinica prodaje je promenjena; ponovo dodajte proizvod.`
                : (product?.name ?? null),
            });
            continue;
          }

          if (
            item.displayPriceMinor !== undefined &&
            item.displayPriceMinor !== product.priceMinor
          ) {
            changedPriceItems.push({
              productId: item.productId,
              productName: product.name,
              previousPriceMinor: item.displayPriceMinor,
              currentPriceMinor: product.priceMinor,
            });
            continue;
          }

          const subtotalMinor = product.priceMinor * item.quantity;
          snapshots.push({
            productId: product.id,
            productName: product.name,
            unitLabel: product.unitLabel,
            unitPriceMinor: product.priceMinor,
            quantity: item.quantity,
            subtotalMinor,
          });
        }

        if (unavailableItems.length > 0) {
          throw new OrderDomainError(
            'PRODUCT_UNAVAILABLE',
            'Jedan ili više proizvoda više nisu dostupni.',
            undefined,
            { items: [...unavailableItems, ...changedPriceItems] },
          );
        }
        if (changedPriceItems.length > 0) {
          throw new OrderDomainError(
            'PRICE_CHANGED',
            'Cena jednog ili više proizvoda je promenjena.',
            undefined,
            { items: changedPriceItems },
          );
        }

        let totalMinor: number;

        try {
          totalMinor = calculateMoneyTotalMinor(
            snapshots,
            ORDER_LIMITS.maximumTotalMinor,
          );
        } catch {
          throw new OrderDomainError(
            'CONFLICT',
            'Ukupan iznos porudžbine nije validan.',
          );
        }

        const confirmation = await persistOrder(
          {
            orderNumber: generateOrderNumber(currentTime, settings.timezone),
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
          },
          tx,
        );
        const emailData = {
          orderId: confirmation.orderId,
          orderNumber: confirmation.orderNumber,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          pickupAt: confirmation.pickupAt,
          totalMinor: confirmation.totalMinor,
          currencyCode: confirmation.currencyCode,
          timezone: settings.timezone,
          items: snapshots,
          bakery: {
            name: settings.bakeryName,
            address: settings.address,
            phone: settings.phone,
            notificationEmail: settings.notificationEmail,
          },
        };
        await recordOrderNotifications(tx, emailData);
        return { confirmation, emailData };
      });
      const deliver = () => deliverOrderNotifications(emailData, notifications);
      if (scheduleNotifications) {
        try {
          scheduleNotifications(deliver);
        } catch {
          safeError({
            event: 'email.scheduling.failed',
            orderId: confirmation.orderId,
          });
        }
      } else {
        await deliver();
      }
      return confirmation;
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

import assert from 'node:assert/strict';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { DateTime } from 'luxon';

import { db } from '../../src/prisma/db.ts';
import type { CheckoutRequestInput } from '../../src/validation/checkout.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

export const INTEGRATION_NOW = DateTime.fromISO(
  '2026-09-14T06:00:00.000Z',
);
export const INTEGRATION_PICKUP_AT = '2026-09-14T07:00:00.000Z';

export async function seedOrderSettingsFixture(): Promise<void> {
  await db.orm.public.BakerySettings.create({
    id: 'default',
    bakeryName: varchar('Integration pekara', 120),
    phone: varchar('+381111234567', 30),
    address: varchar('Test ulica 1', 250),
    notificationEmail: null,
    timezone: varchar('Europe/Belgrade', 100),
    currencyCode: varchar('RSD', 3),
    orderAcceptingEnabled: true,
    minimumPreparationMinutes: 30,
    maximumAdvanceDays: 7,
    pickupSlotMinutes: 30,
  });
  await db.orm.public.BusinessHours.createAll(
    Array.from({ length: 7 }, (_, index) => ({
      bakerySettingsId: 'default',
      weekday: index + 1,
      openMinute: 0,
      closeMinute: 1440,
    })),
  );
}

export function orderRequestFixture(
  productId: string,
  overrides: Partial<CheckoutRequestInput> = {},
): CheckoutRequestInput {
  return {
    idempotencyKey: crypto.randomUUID(),
    customerName: 'Integration Kupac',
    customerPhone: '+381641234567',
    customerEmail: 'integration@example.test',
    note: 'Test napomena',
    pickupAt: INTEGRATION_PICKUP_AT,
    items: [{ productId, quantity: 2, displayPriceMinor: 12_500 }],
    ...overrides,
  };
}

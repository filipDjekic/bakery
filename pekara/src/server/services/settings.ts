import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { ZodIssue } from 'zod';

import { db } from '../../prisma/db.ts';
import {
  bakeryProfileSchema,
  orderSettingsSchema,
  type BakeryProfileInput,
  type OrderSettingsInput,
} from '../../validation/settings.ts';
import { requireAdmin } from '../auth/authorization.ts';
import { DEFAULT_BAKERY_SETTINGS_ID } from '../repositories/bakery-settings.ts';

export class SettingsDomainError extends Error {
  readonly code: 'VALIDATION_ERROR' | 'CONFLICT' | 'NOT_FOUND';
  readonly issues?: ZodIssue[];
  constructor(
    code: 'VALIDATION_ERROR' | 'CONFLICT' | 'NOT_FOUND',
    message: string,
    issues?: ZodIssue[],
  ) {
    super(message);
    this.name = 'SettingsDomainError';
    this.code = code;
    this.issues = issues;
  }
}

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength)
    throw new Error(`Value exceeds varchar(${maxLength}).`);
  return value as Varchar<N>;
}

async function ensureCurrent(expectedUpdatedAt: string) {
  const current = await db.orm.public.BakerySettings.select('updatedAt')
    .where({ id: DEFAULT_BAKERY_SETTINGS_ID })
    .first();
  if (!current)
    throw new SettingsDomainError('NOT_FOUND', 'Podešavanja ne postoje.');
  if (new Date(current.updatedAt).toISOString() !== expectedUpdatedAt)
    throw new SettingsDomainError(
      'CONFLICT',
      'Podešavanja su u međuvremenu promenjena. Osvežite stranicu.',
    );
}

export async function updateBakeryProfile(
  input: BakeryProfileInput,
  authorize: () => Promise<unknown> = requireAdmin,
) {
  await authorize();
  const parsed = bakeryProfileSchema.safeParse(input);
  if (!parsed.success)
    throw new SettingsDomainError(
      'VALIDATION_ERROR',
      'Podaci profila nisu validni.',
      parsed.error.issues,
    );
  await ensureCurrent(parsed.data.expectedUpdatedAt);
  const updated = await db.orm.public.BakerySettings.where({
    id: DEFAULT_BAKERY_SETTINGS_ID,
    updatedAt: parsed.data.expectedUpdatedAt,
  })
    .select('updatedAt')
    .update({
      bakeryName: varchar(parsed.data.bakeryName, 120),
      phone: varchar(parsed.data.phone, 30),
      address: varchar(parsed.data.address, 250),
      notificationEmail: parsed.data.notificationEmail
        ? varchar(parsed.data.notificationEmail, 254)
        : null,
    });
  if (!updated)
    throw new SettingsDomainError(
      'CONFLICT',
      'Podešavanja su promenjena. Osvežite stranicu.',
    );
  return updated;
}

export async function updateOrderSettings(
  input: OrderSettingsInput,
  authorize: () => Promise<unknown> = requireAdmin,
) {
  await authorize();
  const parsed = orderSettingsSchema.safeParse(input);
  if (!parsed.success)
    throw new SettingsDomainError(
      'VALIDATION_ERROR',
      'Operativna podešavanja nisu validna.',
      parsed.error.issues,
    );
  await ensureCurrent(parsed.data.expectedUpdatedAt);
  const updated = await db.orm.public.BakerySettings.where({
    id: DEFAULT_BAKERY_SETTINGS_ID,
    updatedAt: parsed.data.expectedUpdatedAt,
  })
    .select('updatedAt')
    .update({
      orderAcceptingEnabled: parsed.data.orderAcceptingEnabled,
      minimumPreparationMinutes: parsed.data.minimumPreparationMinutes,
      maximumAdvanceDays: parsed.data.maximumAdvanceDays,
      pickupSlotMinutes: parsed.data.pickupSlotMinutes,
    });
  if (!updated)
    throw new SettingsDomainError(
      'CONFLICT',
      'Podešavanja su promenjena. Osvežite stranicu.',
    );
  return updated;
}

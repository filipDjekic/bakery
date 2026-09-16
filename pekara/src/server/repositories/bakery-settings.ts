import 'server-only';

import { db } from '../../prisma/db.ts';

export const DEFAULT_BAKERY_SETTINGS_ID = 'default';

export type PickupBakerySettings = {
  id: string;
  timezone: string;
  currencyCode: string;
  orderAcceptingEnabled: boolean;
  minimumPreparationMinutes: number;
  maximumAdvanceDays: number;
  pickupSlotMinutes: number;
};

export async function getPickupBakerySettings(): Promise<PickupBakerySettings> {
  const settings = await db.orm.public.BakerySettings.select(
    'id',
    'timezone',
    'currencyCode',
    'orderAcceptingEnabled',
    'minimumPreparationMinutes',
    'maximumAdvanceDays',
    'pickupSlotMinutes',
  )
    .where({ id: DEFAULT_BAKERY_SETTINGS_ID })
    .first();

  if (!settings) {
    throw new Error(
      `BakerySettings with id '${DEFAULT_BAKERY_SETTINGS_ID}' does not exist.`,
    );
  }

  return settings;
}

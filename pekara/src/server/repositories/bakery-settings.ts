import 'server-only';

import { db, type DatabaseReader } from '../../prisma/db.ts';

export const DEFAULT_BAKERY_SETTINGS_ID = 'default';

export type PickupBakerySettings = {
  id: string;
  timezone: string;
  currencyCode: string;
  orderAcceptingEnabled: boolean;
  minimumPreparationMinutes: number;
  maximumAdvanceDays: number;
  pickupSlotMinutes: number;
  bakeryName: string;
  phone: string;
  address: string;
  notificationEmail: string | null;
};

export async function getPickupBakerySettings(
  database: DatabaseReader = db,
): Promise<PickupBakerySettings> {
  const settings = await database.orm.public.BakerySettings.select(
    'id',
    'timezone',
    'currencyCode',
    'orderAcceptingEnabled',
    'minimumPreparationMinutes',
    'maximumAdvanceDays',
    'pickupSlotMinutes',
    'bakeryName',
    'phone',
    'address',
    'notificationEmail',
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

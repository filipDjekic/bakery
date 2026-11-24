import 'server-only';

import { db, type DatabaseReader } from '../../prisma/db.ts';

export type PickupBusinessHours = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
};

export async function getBusinessHoursForWeekday(
  bakerySettingsId: string,
  weekday: number,
  database: DatabaseReader = db,
): Promise<PickupBusinessHours[]> {
  const rows = await database.orm.public.BusinessHours.select(
    'weekday',
    'openMinute',
    'closeMinute',
  )
    .where({ bakerySettingsId, weekday })
    .orderBy((hours) => hours.openMinute.asc())
    .all();

  return rows.map(({ weekday: day, openMinute, closeMinute }) => ({
    weekday: day,
    openMinute,
    closeMinute,
  }));
}

export async function getAllBusinessHours(
  bakerySettingsId: string,
  database: DatabaseReader = db,
): Promise<PickupBusinessHours[]> {
  const rows = await database.orm.public.BusinessHours.select(
    'weekday',
    'openMinute',
    'closeMinute',
  )
    .where({ bakerySettingsId })
    .orderBy([
      (hours) => hours.weekday.asc(),
      (hours) => hours.openMinute.asc(),
    ])
    .all();
  return rows.map(({ weekday, openMinute, closeMinute }) => ({
    weekday,
    openMinute,
    closeMinute,
  }));
}

import 'server-only';

import { db } from '../../prisma/db.ts';

export type PickupBusinessHours = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
};

export async function getBusinessHoursForWeekday(
  bakerySettingsId: string,
  weekday: number,
): Promise<PickupBusinessHours[]> {
  const rows = await db.orm.public.BusinessHours.select(
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

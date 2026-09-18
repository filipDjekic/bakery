import 'server-only';

import { db } from '../../prisma/db.ts';
import { requireAdmin } from '../auth/authorization.ts';
import { DEFAULT_BAKERY_SETTINGS_ID } from '../repositories/bakery-settings.ts';

export async function getAdminSettings(
  authorize: () => Promise<unknown> = requireAdmin,
) {
  await authorize();
  const settings = await db.orm.public.BakerySettings.include(
    'businessHours',
    (hours) =>
      hours
        .orderBy((hour) => hour.weekday.asc())
        .orderBy((hour) => hour.openMinute.asc()),
  )
    .where({ id: DEFAULT_BAKERY_SETTINGS_ID })
    .first();
  if (!settings) throw new Error('Bakery settings singleton does not exist.');
  return { ...settings, updatedAt: new Date(settings.updatedAt).toISOString() };
}

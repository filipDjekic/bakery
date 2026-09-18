import 'server-only';

import { db } from '../../prisma/db.ts';
import { workingHoursSchema } from '../../validation/settings.ts';
import { requireAdmin } from '../auth/authorization.ts';
import { DEFAULT_BAKERY_SETTINGS_ID } from '../repositories/bakery-settings.ts';
import { SettingsDomainError } from './settings.ts';

export async function updateWorkingHours(
  input: unknown,
  authorize: () => Promise<unknown> = requireAdmin,
) {
  await authorize();
  const parsed = workingHoursSchema.safeParse(input);
  if (!parsed.success)
    throw new SettingsDomainError(
      'VALIDATION_ERROR',
      'Radno vreme nije validno.',
      parsed.error.issues,
    );
  await db.transaction(async (tx) => {
    await tx.orm.public.BusinessHours.where({
      bakerySettingsId: DEFAULT_BAKERY_SETTINGS_ID,
    }).deleteAll();
    if (parsed.data.length > 0) {
      await tx.orm.public.BusinessHours.createAll(
        parsed.data.map((interval) => ({
          ...interval,
          bakerySettingsId: DEFAULT_BAKERY_SETTINGS_ID,
        })),
      );
    }
  });
  return parsed.data;
}

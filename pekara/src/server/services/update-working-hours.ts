import 'server-only';

import { db } from '../../prisma/db.ts';
import { workingHoursSchema } from '../../validation/settings.ts';
import { requireAdmin } from '../auth/authorization.ts';
import { DEFAULT_BAKERY_SETTINGS_ID } from '../repositories/bakery-settings.ts';
import { SettingsDomainError } from './settings.ts';

export async function updateWorkingHours(
  input: unknown,
  expectedUpdatedAt: string,
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
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(expectedUpdatedAt) ||
    !Number.isFinite(Date.parse(expectedUpdatedAt))
  )
    throw new SettingsDomainError(
      'VALIDATION_ERROR',
      'Verzija podešavanja nije validna.',
    );
  return db.transaction(async (tx) => {
    const changed = await tx.orm.public.BakerySettings.where({
      id: DEFAULT_BAKERY_SETTINGS_ID,
      updatedAt: expectedUpdatedAt,
    })
      .select('updatedAt')
      .updateAll({
        updatedAt: new Date(
          Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1),
        ).toISOString(),
      });
    if (changed.length !== 1)
      throw new SettingsDomainError(
        'CONFLICT',
        'Radno vreme je u međuvremenu promenjeno. Osvežite stranicu.',
      );
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
    return changed[0]!;
  });
}

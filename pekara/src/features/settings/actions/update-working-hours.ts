'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../../server/auth/authorization.ts';
import { updateWorkingHours } from '../../../server/services/update-working-hours.ts';
import { settingsActionError } from './settings-action-error.ts';
import type { SettingsActionState } from './settings-action-state.ts';

export async function updateWorkingHoursAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireAdmin();
    const raw = JSON.parse(
      String(formData.get('intervals') ?? '[]'),
    ) as unknown;
    await updateWorkingHours(raw, async () => undefined);
    revalidatePath('/');
    revalidatePath('/checkout');
    revalidatePath('/api/pickup-slots');
    revalidatePath('/admin/settings');
    return { status: 'success', message: 'Radno vreme je sačuvano.' };
  } catch (error) {
    return settingsActionError(error);
  }
}

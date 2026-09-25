'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '../../../server/auth/authorization.ts';
import { updateNotificationSettings } from '../../../server/services/settings.ts';
import { settingsActionError } from './settings-action-error.ts';
import type { SettingsActionState } from './settings-action-state.ts';

export async function updateNotificationSettingsAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireAdmin();
    const result = await updateNotificationSettings(
      {
        notificationEmail: String(formData.get('notificationEmail') ?? ''),
        expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
      },
      async () => undefined,
    );
    revalidatePath('/admin/settings');
    return {
      status: 'success',
      message: 'Podešavanja obaveštenja su sačuvana.',
      updatedAt: new Date(result.updatedAt).toISOString(),
    };
  } catch (error) {
    return settingsActionError(error);
  }
}

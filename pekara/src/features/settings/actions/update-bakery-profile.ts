'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '../../../server/auth/authorization.ts';
import { PUBLIC_CACHE_TAGS } from '../../../server/cache/tags.ts';
import { updateBakeryProfile } from '../../../server/services/settings.ts';
import { settingsActionError } from './settings-action-error.ts';
import type { SettingsActionState } from './settings-action-state.ts';

export async function updateBakeryProfileAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireAdmin();
    const result = await updateBakeryProfile(
      {
        bakeryName: String(formData.get('bakeryName') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        address: String(formData.get('address') ?? ''),
        notificationEmail: String(formData.get('notificationEmail') ?? ''),
        expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
      },
      async () => undefined,
    );
    updateTag(PUBLIC_CACHE_TAGS.settings);
    revalidatePath('/');
    revalidatePath('/admin/settings');
    return {
      status: 'success',
      message: 'Profil pekare je sačuvan.',
      updatedAt: new Date(result.updatedAt).toISOString(),
    };
  } catch (error) {
    return settingsActionError(error);
  }
}

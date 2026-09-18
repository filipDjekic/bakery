'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '../../../server/auth/authorization.ts';
import { PUBLIC_CACHE_TAGS } from '../../../server/cache/tags.ts';
import { updateOrderSettings } from '../../../server/services/settings.ts';
import { settingsActionError } from './settings-action-error.ts';
import type { SettingsActionState } from './settings-action-state.ts';

export async function updateOrderSettingsAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireAdmin();
    const result = await updateOrderSettings(
      {
        orderAcceptingEnabled: formData.get('orderAcceptingEnabled') === 'on',
        minimumPreparationMinutes: String(
          formData.get('minimumPreparationMinutes') ?? '',
        ),
        maximumAdvanceDays: String(formData.get('maximumAdvanceDays') ?? ''),
        pickupSlotMinutes: String(formData.get('pickupSlotMinutes') ?? ''),
        expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
      },
      async () => undefined,
    );
    updateTag(PUBLIC_CACHE_TAGS.settings);
    revalidatePath('/');
    revalidatePath('/checkout');
    revalidatePath('/api/pickup-slots');
    revalidatePath('/admin/settings');
    return {
      status: 'success',
      message: 'Operativna podešavanja su sačuvana.',
      updatedAt: new Date(result.updatedAt).toISOString(),
    };
  } catch (error) {
    return settingsActionError(error);
  }
}

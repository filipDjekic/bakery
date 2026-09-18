import { AppError } from '../../../server/errors/app-error.ts';
import { safeActionFailure } from '../../../server/errors/safe-action-result.ts';
import { SettingsDomainError } from '../../../server/services/settings.ts';
import type { SettingsActionState } from './settings-action-state.ts';

export function settingsActionError(error: unknown): SettingsActionState {
  const result = safeActionFailure(error, (cause) =>
    cause instanceof SettingsDomainError
      ? new AppError({ code: cause.code, safeMessage: cause.message, cause })
      : null,
  );
  if (result.ok) throw new Error('Expected safe action failure.');
  return { status: 'error', message: result.error.message };
}

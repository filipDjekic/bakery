import type { SettingsActionState } from '../actions/settings-action-state';

export function SettingsFeedback({ state }: { state: SettingsActionState }) {
  if (state.status === 'idle') return null;
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={
        state.status === 'error'
          ? 'rounded-md bg-red-50 px-4 py-3 text-sm text-red-800'
          : 'rounded-md bg-green-50 px-4 py-3 text-sm text-green-800'
      }
    >
      {state.message}
    </p>
  );
}

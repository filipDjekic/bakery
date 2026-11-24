'use client';
import type { SettingsActionState } from '../actions/settings-action-state';

export function SettingsFeedback({ state }: { state: SettingsActionState }) {
  if (state.status === 'idle') return null;
  return (
    <div
      role={state.status === 'error' ? 'alert' : 'status'}
      className={
        state.status === 'error'
          ? 'rounded-md bg-red-50 px-4 py-3 text-sm text-red-800'
          : 'rounded-md bg-green-50 px-4 py-3 text-sm text-green-800'
      }
    >
      {state.message}
      {state.code === 'CONFLICT' ? (
        <div className="mt-3">
          <p>
            Unos je sačuvan u obrascu. Kopirajte izmene pre ponovnog učitavanja.
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 font-bold underline"
            onClick={() => window.location.reload()}
          >
            Ponovo učitaj podatke
          </button>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderSettingsAction } from '../actions/update-order-settings';
import { initialSettingsActionState } from '../actions/settings-action-state';
import { SettingsFeedback } from './settings-feedback';

type Props = {
  settings: {
    orderAcceptingEnabled: boolean;
    minimumPreparationMinutes: number;
    maximumAdvanceDays: number;
    pickupSlotMinutes: number;
    updatedAt: string;
  };
};
export function OrderSettingsForm({ settings }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateOrderSettingsAction,
    initialSettingsActionState,
  );
  useEffect(() => {
    if (state.status === 'success') router.refresh();
  }, [router, state.status]);
  return (
    <form
      action={action}
      className="border-border bg-surface space-y-5 rounded-xl border p-6"
    >
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={state.updatedAt ?? settings.updatedAt}
      />
      <div>
        <h2 className="text-xl font-bold">Poručivanje i preuzimanje</h2>
        <p className="text-muted mt-1 text-sm">
          Promene važe za nove i ponovo potvrđene termine.
        </p>
      </div>
      <label className="flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          name="orderAcceptingEnabled"
          defaultChecked={settings.orderAcceptingEnabled}
        />{' '}
        Primanje porudžbina je uključeno
      </label>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="font-semibold">Priprema (min)</span>
          <input
            required
            type="number"
            min={0}
            max={240}
            name="minimumPreparationMinutes"
            defaultValue={settings.minimumPreparationMinutes}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Dana unapred</span>
          <input
            required
            type="number"
            min={0}
            max={30}
            name="maximumAdvanceDays"
            defaultValue={settings.maximumAdvanceDays}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Korak termina</span>
          <select
            name="pickupSlotMinutes"
            defaultValue={settings.pickupSlotMinutes}
            className="border-border w-full rounded-md border px-3 py-2"
          >
            {[5, 10, 15, 20, 30, 60].map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <SettingsFeedback state={state} />
      <button
        disabled={pending}
        className="bg-primary rounded-md px-5 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Čuvanje…' : 'Sačuvaj pravila'}
      </button>
    </form>
  );
}

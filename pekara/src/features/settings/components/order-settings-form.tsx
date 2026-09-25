'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { cardVariants } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';

import { initialSettingsActionState } from '../actions/settings-action-state';
import { updateOrderSettingsAction } from '../actions/update-order-settings';
import { SettingsFormActions } from './settings-form-actions';

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
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(
    updateOrderSettingsAction,
    initialSettingsActionState,
  );

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      id="orders"
      action={action}
      onSubmit={() => setDirty(false)}
      onChange={() => setDirty(true)}
      className={cardVariants({
        className: 'scroll-mt-24 space-y-5 rounded-xl p-6',
      })}
    >
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={state.updatedAt ?? settings.updatedAt}
      />
      <div>
        <h2 className="text-xl font-bold">Porudžbine</h2>
        <p className="text-muted mt-1 text-sm">
          Podešavanja prihvatanja porudžbina i termina preuzimanja.
        </p>
      </div>
      <label className="flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          name="orderAcceptingEnabled"
          defaultChecked={settings.orderAcceptingEnabled}
        />
        Primanje porudžbina je uključeno
      </label>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="font-semibold">Priprema (min)</span>
          <Input
            required
            type="number"
            min={0}
            max={240}
            name="minimumPreparationMinutes"
            defaultValue={settings.minimumPreparationMinutes}
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Dana unapred</span>
          <Input
            required
            type="number"
            min={0}
            max={30}
            name="maximumAdvanceDays"
            defaultValue={settings.maximumAdvanceDays}
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Korak termina</span>
          <Select
            name="pickupSlotMinutes"
            defaultValue={settings.pickupSlotMinutes}
          >
            {[5, 10, 15, 20, 30, 60].map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </Select>
        </label>
      </div>
      <SettingsFormActions
        state={state}
        pending={pending}
        dirty={dirty || state.status === 'error'}
        idleLabel="Sačuvaj pravila"
      />
    </form>
  );
}

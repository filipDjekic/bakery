'use client';
import { usePreservedFormAction } from '@/lib/use-preserved-form-action';

import { useEffect, useState } from 'react';
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
  const [state, action, pending] = usePreservedFormAction(
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
      onSubmit={(event) => {
        action(event);
        setDirty(false);
      }}
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
          <span id="minimumPreparationMinutes-label" className="font-semibold">
            Priprema (min)
          </span>
          <Input
            required
            type="number"
            min={0}
            max={240}
            id="minimumPreparationMinutes"
            aria-labelledby="minimumPreparationMinutes-label"
            aria-invalid={Boolean(state.fieldErrors?.minimumPreparationMinutes)}
            aria-describedby={
              state.fieldErrors?.minimumPreparationMinutes
                ? 'minimumPreparationMinutes-error'
                : undefined
            }
            name="minimumPreparationMinutes"
            defaultValue={settings.minimumPreparationMinutes}
          />
          {state.fieldErrors?.minimumPreparationMinutes ? (
            <span
              id="minimumPreparationMinutes-error"
              className="block text-sm text-red-800"
            >
              {state.fieldErrors.minimumPreparationMinutes}
            </span>
          ) : null}
        </label>
        <label className="space-y-2">
          <span id="maximumAdvanceDays-label" className="font-semibold">
            Dana unapred
          </span>
          <Input
            required
            type="number"
            min={0}
            max={30}
            id="maximumAdvanceDays"
            aria-labelledby="maximumAdvanceDays-label"
            aria-invalid={Boolean(state.fieldErrors?.maximumAdvanceDays)}
            aria-describedby={
              state.fieldErrors?.maximumAdvanceDays
                ? 'maximumAdvanceDays-error'
                : undefined
            }
            name="maximumAdvanceDays"
            defaultValue={settings.maximumAdvanceDays}
          />
          {state.fieldErrors?.maximumAdvanceDays ? (
            <span
              id="maximumAdvanceDays-error"
              className="block text-sm text-red-800"
            >
              {state.fieldErrors.maximumAdvanceDays}
            </span>
          ) : null}
        </label>
        <label className="space-y-2">
          <span id="pickupSlotMinutes-label" className="font-semibold">
            Korak termina
          </span>
          <Select
            id="pickupSlotMinutes"
            aria-labelledby="pickupSlotMinutes-label"
            aria-invalid={Boolean(state.fieldErrors?.pickupSlotMinutes)}
            aria-describedby={
              state.fieldErrors?.pickupSlotMinutes
                ? 'pickupSlotMinutes-error'
                : undefined
            }
            name="pickupSlotMinutes"
            defaultValue={settings.pickupSlotMinutes}
          >
            {[5, 10, 15, 20, 30, 60].map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </Select>
          {state.fieldErrors?.pickupSlotMinutes ? (
            <span
              id="pickupSlotMinutes-error"
              className="block text-sm text-red-800"
            >
              {state.fieldErrors.pickupSlotMinutes}
            </span>
          ) : null}
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

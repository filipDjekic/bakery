'use client';
import { usePreservedFormAction } from '@/lib/use-preserved-form-action';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { cardVariants } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { initialSettingsActionState } from '../actions/settings-action-state';
import { updateBakeryProfileAction } from '../actions/update-bakery-profile';
import { SettingsFormActions } from './settings-form-actions';

type Props = {
  settings: {
    bakeryName: string;
    phone: string;
    address: string;
    updatedAt: string;
  };
};

export function BakeryProfileForm({ settings }: Props) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = usePreservedFormAction(
    updateBakeryProfileAction,
    initialSettingsActionState,
  );

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      id="profile"
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
        <h2 className="text-xl font-bold">Profil pekare</h2>
        <p className="text-muted mt-1 text-sm">
          Osnovni podaci koji se prikazuju kupcima.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span id="bakeryName-label" className="font-semibold">
            Naziv
          </span>
          <Input
            required
            maxLength={120}
            id="bakeryName"
            aria-labelledby="bakeryName-label"
            aria-invalid={Boolean(state.fieldErrors?.bakeryName)}
            aria-describedby={
              state.fieldErrors?.bakeryName ? 'bakeryName-error' : undefined
            }
            name="bakeryName"
            defaultValue={settings.bakeryName}
          />
          {state.fieldErrors?.bakeryName ? (
            <span id="bakeryName-error" className="block text-sm text-red-800">
              {state.fieldErrors.bakeryName}
            </span>
          ) : null}
        </label>
        <label className="space-y-2">
          <span id="phone-label" className="font-semibold">
            Telefon
          </span>
          <Input
            required
            maxLength={30}
            id="phone"
            aria-labelledby="phone-label"
            aria-invalid={Boolean(state.fieldErrors?.phone)}
            aria-describedby={
              state.fieldErrors?.phone ? 'phone-error' : undefined
            }
            name="phone"
            defaultValue={settings.phone}
          />
          {state.fieldErrors?.phone ? (
            <span id="phone-error" className="block text-sm text-red-800">
              {state.fieldErrors.phone}
            </span>
          ) : null}
        </label>
      </div>
      <label className="block space-y-2">
        <span id="address-label" className="font-semibold">
          Adresa
        </span>
        <Input
          required
          maxLength={250}
          id="address"
          aria-labelledby="address-label"
          aria-invalid={Boolean(state.fieldErrors?.address)}
          aria-describedby={
            state.fieldErrors?.address ? 'address-error' : undefined
          }
          name="address"
          defaultValue={settings.address}
        />
        {state.fieldErrors?.address ? (
          <span id="address-error" className="block text-sm text-red-800">
            {state.fieldErrors.address}
          </span>
        ) : null}
      </label>
      <SettingsFormActions
        state={state}
        pending={pending}
        dirty={dirty || state.status === 'error'}
        idleLabel="Sačuvaj profil"
      />
    </form>
  );
}

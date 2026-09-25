'use client';

import { useActionState, useEffect, useState } from 'react';
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
  const [state, action, pending] = useActionState(
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
        <h2 className="text-xl font-bold">Profil pekare</h2>
        <p className="text-muted mt-1 text-sm">
          Osnovni podaci koji se prikazuju kupcima.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Naziv</span>
          <Input
            required
            maxLength={120}
            name="bakeryName"
            defaultValue={settings.bakeryName}
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Telefon</span>
          <Input
            required
            maxLength={30}
            name="phone"
            defaultValue={settings.phone}
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="font-semibold">Adresa</span>
        <Input
          required
          maxLength={250}
          name="address"
          defaultValue={settings.address}
        />
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

'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateBakeryProfileAction } from '../actions/update-bakery-profile';
import { initialSettingsActionState } from '../actions/settings-action-state';
import { SettingsFeedback } from './settings-feedback';

type Props = {
  settings: {
    bakeryName: string;
    phone: string;
    address: string;
    notificationEmail: string | null;
    updatedAt: string;
  };
};
export function BakeryProfileForm({ settings }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    updateBakeryProfileAction,
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
      <h2 className="text-xl font-bold">Profil pekare</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Naziv</span>
          <input
            required
            maxLength={120}
            name="bakeryName"
            defaultValue={settings.bakeryName}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Telefon</span>
          <input
            required
            maxLength={30}
            name="phone"
            defaultValue={settings.phone}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="font-semibold">Adresa</span>
        <input
          required
          maxLength={250}
          name="address"
          defaultValue={settings.address}
          className="border-border w-full rounded-md border px-3 py-2"
        />
      </label>
      <label className="block space-y-2">
        <span className="font-semibold">Email za obaveštenja</span>
        <input
          type="email"
          maxLength={254}
          name="notificationEmail"
          defaultValue={settings.notificationEmail ?? ''}
          className="border-border w-full rounded-md border px-3 py-2"
        />
      </label>
      <SettingsFeedback state={state} />
      <button
        disabled={pending}
        className="bg-primary rounded-md px-5 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Čuvanje…' : 'Sačuvaj profil'}
      </button>
    </form>
  );
}

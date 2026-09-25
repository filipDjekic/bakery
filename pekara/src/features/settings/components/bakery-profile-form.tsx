'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
      className={cardVariants({ className: 'space-y-5 rounded-xl p-6' })}
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
      <label className="block space-y-2">
        <span className="font-semibold">Email za obaveštenja</span>
        <Input
          type="email"
          maxLength={254}
          name="notificationEmail"
          defaultValue={settings.notificationEmail ?? ''}
        />
      </label>
      <SettingsFeedback state={state} />
      <Button disabled={pending}>
        {pending ? 'Čuvanje…' : 'Sačuvaj profil'}
      </Button>
    </form>
  );
}

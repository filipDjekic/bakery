'use client';
import { usePreservedFormAction } from '@/lib/use-preserved-form-action';

import { useState } from 'react';

import { cardVariants } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { initialSettingsActionState } from '../actions/settings-action-state';
import { updateNotificationSettingsAction } from '../actions/update-notification-settings';
import { SettingsFormActions } from './settings-form-actions';

export function NotificationSettingsForm({
  notificationEmail,
  updatedAt,
}: {
  notificationEmail: string | null;
  updatedAt: string;
}) {
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = usePreservedFormAction(
    updateNotificationSettingsAction,
    initialSettingsActionState,
  );

  return (
    <form
      id="notifications"
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
        value={state.updatedAt ?? updatedAt}
      />
      <div>
        <h2 className="text-xl font-bold">Obaveštenja</h2>
        <p className="text-muted mt-1 text-sm">
          Nova porudžbina se šalje na ovu adresu. Prazno polje isključuje email
          obaveštenja za pekaru.
        </p>
      </div>
      <label className="block space-y-2">
        <span id="notificationEmail-label" className="font-semibold">
          Email za obaveštenja
        </span>
        <Input
          type="email"
          maxLength={254}
          id="notificationEmail"
          aria-labelledby="notificationEmail-label"
          aria-invalid={Boolean(state.fieldErrors?.notificationEmail)}
          aria-describedby={
            state.fieldErrors?.notificationEmail
              ? 'notificationEmail-error'
              : undefined
          }
          name="notificationEmail"
          defaultValue={notificationEmail ?? ''}
        />
        {state.fieldErrors?.notificationEmail ? (
          <span
            id="notificationEmail-error"
            className="block text-sm text-red-800"
          >
            {state.fieldErrors.notificationEmail}
          </span>
        ) : null}
      </label>
      <p id="notification-email-description" className="text-muted text-sm">
        Koristi se samo za interno obaveštenje o novoj porudžbini. API ključevi
        se ne prikazuju niti menjaju ovde.
      </p>
      <SettingsFormActions
        state={state}
        pending={pending}
        dirty={dirty || state.status === 'error'}
        idleLabel="Sačuvaj obaveštenja"
      />
    </form>
  );
}

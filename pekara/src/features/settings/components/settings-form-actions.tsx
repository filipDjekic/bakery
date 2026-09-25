import { Button } from '@/components/ui/button';

import type { SettingsActionState } from '../actions/settings-action-state';
import { SettingsFeedback } from './settings-feedback';

export function SettingsFormActions({
  state,
  pending,
  dirty,
  idleLabel,
}: {
  state: SettingsActionState;
  pending: boolean;
  dirty: boolean;
  idleLabel: string;
}) {
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      <div aria-live="polite">
        {dirty && !pending ? (
          <p className="text-muted text-sm">Nesačuvane izmene</p>
        ) : null}
        <SettingsFeedback state={state} />
      </div>
      <Button type="submit" disabled={pending || !dirty}>
        {pending ? 'Čuvanje…' : idleLabel}
      </Button>
    </div>
  );
}

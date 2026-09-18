'use client';

import { useActionState, useState } from 'react';
import { updateWorkingHoursAction } from '../actions/update-working-hours';
import { initialSettingsActionState } from '../actions/settings-action-state';
import { DayHoursEditor, type EditableInterval } from './day-hours-editor';
import { SettingsFeedback } from './settings-feedback';

const days = [
  'Ponedeljak',
  'Utorak',
  'Sreda',
  'Četvrtak',
  'Petak',
  'Subota',
  'Nedelja',
];
export function WorkingHoursEditor({
  initialIntervals,
  timezone,
}: {
  initialIntervals: EditableInterval[];
  timezone: string;
}) {
  const [intervals, setIntervals] = useState(initialIntervals);
  const [state, action, pending] = useActionState(
    updateWorkingHoursAction,
    initialSettingsActionState,
  );
  return (
    <form
      action={action}
      className="border-border bg-surface space-y-5 rounded-xl border p-6"
    >
      <input type="hidden" name="intervals" value={JSON.stringify(intervals)} />
      <div>
        <h2 className="text-xl font-bold">Radno vreme</h2>
        <p className="text-muted mt-1 text-sm">
          Vremenska zona: <strong>{timezone}</strong>
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {days.map((label, index) => {
          const weekday = index + 1;
          return (
            <DayHoursEditor
              key={weekday}
              weekday={weekday}
              label={label}
              intervals={intervals.filter(
                (interval) => interval.weekday === weekday,
              )}
              onChange={(dayIntervals) =>
                setIntervals((current) => [
                  ...current.filter((interval) => interval.weekday !== weekday),
                  ...dayIntervals,
                ])
              }
            />
          );
        })}
      </div>
      <SettingsFeedback state={state} />
      <button
        disabled={pending}
        className="bg-primary rounded-md px-5 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Čuvanje…' : 'Sačuvaj radno vreme'}
      </button>
    </form>
  );
}

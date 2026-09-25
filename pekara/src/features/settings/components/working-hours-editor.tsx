'use client';

import { useActionState, useState } from 'react';

import { cardVariants } from '@/components/ui/card';

import { initialSettingsActionState } from '../actions/settings-action-state';
import { updateWorkingHoursAction } from '../actions/update-working-hours';
import { DayHoursEditor, type EditableInterval } from './day-hours-editor';
import { SettingsFormActions } from './settings-form-actions';

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
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(
    updateWorkingHoursAction,
    initialSettingsActionState,
  );

  return (
    <form
      id="hours"
      action={action}
      onSubmit={() => setDirty(false)}
      className={cardVariants({
        className: 'scroll-mt-24 space-y-5 rounded-xl p-6',
      })}
    >
      <input type="hidden" name="intervals" value={JSON.stringify(intervals)} />
      <div>
        <h2 className="text-xl font-bold">Radno vreme</h2>
        <p className="text-muted mt-1 text-sm">
          Nedeljni raspored i intervali preuzimanja. Vremenska zona:{' '}
          <strong>{timezone}</strong>
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
              onChange={(dayIntervals) => {
                setDirty(true);
                setIntervals((current) => [
                  ...current.filter((interval) => interval.weekday !== weekday),
                  ...dayIntervals,
                ]);
              }}
            />
          );
        })}
      </div>
      <SettingsFormActions
        state={state}
        pending={pending}
        dirty={dirty || state.status === 'error'}
        idleLabel="Sačuvaj radno vreme"
      />
    </form>
  );
}

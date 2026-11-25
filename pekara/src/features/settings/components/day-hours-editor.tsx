import { useState } from 'react';
import { minutesToTimeString, timeStringToMinutes } from '@/lib/datetime';
import { workingHoursSchema } from '@/validation/settings';
export type EditableInterval = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
};

function TimeInput({
  value,
  onChange,
  end,
  label,
}: {
  value: number;
  onChange: (minute: number) => void;
  end?: boolean;
  label: string;
}) {
  const [text, setText] = useState(() => minutesToTimeString(value, end));
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    setText(minutesToTimeString(value, end));
  }
  const valid =
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ||
    Boolean(end && text === '24:00');
  return (
    <>
      <input
        aria-label={label}
        required
        type="text"
        inputMode="numeric"
        placeholder="HH:mm"
        pattern={
          end
            ? '(?:(?:[01]\\d|2[0-3]):[0-5]\\d|24:00)'
            : '(?:[01]\\d|2[0-3]):[0-5]\\d'
        }
        value={text}
        aria-invalid={!valid}
        onChange={(event) => {
          setText(event.target.value);
          try {
            onChange(timeStringToMinutes(event.target.value, end));
          } catch {
            /* Keep the draft until the wall time is complete. */
          }
        }}
        className="border-border block w-28 rounded-md border px-3 py-2"
      />
      {!valid ? (
        <span className="block text-xs text-red-800">Unesite HH:mm.</span>
      ) : null}
    </>
  );
}

export function DayHoursEditor({
  weekday,
  label,
  intervals,
  onChange,
}: {
  weekday: number;
  label: string;
  intervals: EditableInterval[];
  onChange: (intervals: EditableInterval[]) => void;
}) {
  const closed = intervals.length === 0;
  const validation = workingHoursSchema.safeParse(intervals);
  return (
    <fieldset className="border-border rounded-lg border p-4">
      <legend className="px-2 font-semibold">{label}</legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={closed}
          onChange={(event) =>
            onChange(
              event.target.checked
                ? []
                : [{ weekday, openMinute: 360, closeMinute: 1200 }],
            )
          }
        />{' '}
        Zatvoreno
      </label>
      {!validation.success ? (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {validation.error.issues[0]?.message}
        </p>
      ) : null}
      {!closed ? (
        <div className="mt-4 space-y-3">
          {intervals.map((interval, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="text-xs">Od</span>
                <TimeInput
                  label={`${label} od ${index + 1}`}
                  value={interval.openMinute}
                  onChange={(minute) =>
                    onChange(
                      intervals.map((item, i) =>
                        i === index ? { ...item, openMinute: minute } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs">Do</span>
                <TimeInput
                  end
                  label={`${label} do ${index + 1}`}
                  value={interval.closeMinute}
                  onChange={(minute) =>
                    onChange(
                      intervals.map((item, i) =>
                        i === index ? { ...item, closeMinute: minute } : item,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    intervals.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="min-h-10 rounded-md border border-red-300 px-3 text-sm text-red-800"
              >
                Ukloni
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange([
                ...intervals,
                { weekday, openMinute: 780, closeMinute: 1020 },
              ])
            }
            className="border-border rounded-md border px-3 py-2 text-sm font-semibold"
          >
            Dodaj interval
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}

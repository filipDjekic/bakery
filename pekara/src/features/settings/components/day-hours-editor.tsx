export type EditableInterval = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
};

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
function toMinute(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
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
      {!closed ? (
        <div className="mt-4 space-y-3">
          {intervals.map((interval, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="text-xs">Od</span>
                <input
                  aria-label={`${label} od ${index + 1}`}
                  type="text"
                  inputMode="numeric"
                  pattern="(?:[01]\\d|2[0-3]):[0-5]\\d"
                  value={toTime(interval.openMinute)}
                  onChange={(event) =>
                    onChange(
                      intervals.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              openMinute: toMinute(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                  className="border-border block rounded-md border px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs">Do</span>
                <input
                  aria-label={`${label} do ${index + 1}`}
                  type="text"
                  inputMode="numeric"
                  pattern="(?:(?:[01]\\d|2[0-3]):[0-5]\\d|24:00)"
                  value={toTime(interval.closeMinute)}
                  onChange={(event) =>
                    onChange(
                      intervals.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              closeMinute: toMinute(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                  className="border-border block rounded-md border px-3 py-2"
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

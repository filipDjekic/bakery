import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

import type { PickupSlot } from '@/server/services/pickup-slots';

type PickupSelectorProps = {
  dateRegistration: UseFormRegisterReturn<'pickupDate'>;
  timeRegistration: UseFormRegisterReturn<'pickupAt'>;
  dateError?: FieldError;
  timeError?: FieldError;
  slots: PickupSlot[];
  bakeryTimezone: string | null;
  isLoading: boolean;
  loadError: string | null;
  hasSelectedDate: boolean;
  onDateChange: (value: string) => void;
};

const inputClassName =
  'border-border bg-surface text-foreground focus-visible:ring-primary mt-2 min-h-11 w-full rounded-md border px-3 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';

export function PickupSelector({
  dateRegistration,
  timeRegistration,
  dateError,
  timeError,
  slots,
  bakeryTimezone,
  isLoading,
  loadError,
  hasSelectedDate,
  onDateChange,
}: PickupSelectorProps) {
  return (
    <fieldset className="border-border mt-8 border-t pt-7">
      <legend className="text-foreground text-lg font-semibold">
        Termin preuzimanja
      </legend>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pickupDate" className="text-sm font-semibold">
            Datum
          </label>
          <input
            {...dateRegistration}
            id="pickupDate"
            type="date"
            aria-invalid={dateError ? true : undefined}
            aria-describedby={dateError ? 'pickupDate-error' : undefined}
            onChange={(event) => {
              void dateRegistration.onChange(event);
              onDateChange(event.target.value);
            }}
            className={inputClassName}
          />
          {dateError ? (
            <p id="pickupDate-error" className="mt-2 text-sm text-red-700">
              {dateError.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="pickupAt" className="text-sm font-semibold">
            Vreme
          </label>
          <select
            {...timeRegistration}
            id="pickupAt"
            disabled={!hasSelectedDate || isLoading || slots.length === 0}
            aria-invalid={timeError ? true : undefined}
            aria-describedby={timeError ? 'pickupAt-error' : undefined}
            className={inputClassName}
          >
            <option value="">
              {isLoading ? 'Učitavanje termina…' : 'Izaberite vreme'}
            </option>
            {slots.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          {timeError ? (
            <p id="pickupAt-error" className="mt-2 text-sm text-red-700">
              {timeError.message}
            </p>
          ) : null}
        </div>
      </div>

      <div aria-live="polite" className="text-muted mt-3 min-h-6 text-sm">
        {loadError ? <p className="text-red-700">{loadError}</p> : null}
        {!loadError && hasSelectedDate && !isLoading && slots.length === 0 ? (
          <p>Nema dostupnih termina za izabrani datum.</p>
        ) : null}
        {!loadError && bakeryTimezone ? (
          <p>Termini su prikazani u vremenskoj zoni {bakeryTimezone}.</p>
        ) : null}
      </div>
    </fieldset>
  );
}

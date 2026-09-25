import { Check, Clock3 } from 'lucide-react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

import { cardVariants } from '@/components/ui/card';
import { focusRingClassName } from '@/components/ui/focus';
import { cn } from '@/lib/cn';
import type {
  PickupAvailability,
  PickupSlot,
} from '@/server/services/pickup-slots';

type Props = {
  availability: PickupAvailability;
  dateRegistration: UseFormRegisterReturn<'pickupDate'>;
  timeRegistration: UseFormRegisterReturn<'pickupAt'>;
  dateError?: FieldError;
  timeError?: FieldError;
  slots: PickupSlot[];
  selectedDate: string;
  selectedTime: string;
  isLoading: boolean;
  loadError: string | null;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
};

export function PickupSelector({
  availability,
  dateRegistration,
  timeRegistration,
  dateError,
  timeError,
  slots,
  selectedDate,
  selectedTime,
  isLoading,
  loadError,
  onDateChange,
  onTimeChange,
}: Props) {
  return (
    <fieldset className={cardVariants({ className: 'p-5 sm:p-6' })}>
      <legend className="sr-only">2. Termin preuzimanja</legend>
      <h2 className="text-xl font-bold">2. Termin preuzimanja</h2>

      <div className="bg-surface-muted border-border mt-5 flex items-start gap-3 rounded-xl border p-4">
        <Clock3
          aria-hidden
          className="text-primary mt-0.5 shrink-0"
          size={20}
        />
        <div>
          <p className="text-muted text-xs font-bold tracking-wide uppercase">
            Najranije preuzimanje
          </p>
          <p className="mt-1 font-semibold">
            {availability.earliestSlot
              ? `${availability.earliestSlot.dateLabel} u ${availability.earliestSlot.label}`
              : 'Trenutno nema dostupnih termina za preuzimanje.'}
          </p>
        </div>
      </div>

      <input {...dateRegistration} type="hidden" />
      <input {...timeRegistration} type="hidden" />

      <p className="mt-6 text-sm font-semibold">Izaberite dan</p>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
        {availability.dates.map((option) => {
          const selected = option.date === selectedDate;
          return (
            <button
              key={option.date}
              type="button"
              aria-pressed={selected}
              onClick={() => onDateChange(option.date)}
              className={cn(
                'min-h-14 shrink-0 rounded-xl border px-4 py-2 text-left transition-colors',
                focusRingClassName,
                selected
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface hover:border-primary',
              )}
            >
              <span className="flex items-center gap-2 font-bold">
                {selected ? <Check aria-hidden size={15} /> : null}
                {option.label}
              </span>
              <span
                className={`block text-xs ${selected ? 'text-orange-50' : 'text-muted'}`}
              >
                {option.shortDateLabel}
              </span>
            </button>
          );
        })}
      </div>
      {dateError ? (
        <p className="mt-2 text-sm text-red-700">{dateError.message}</p>
      ) : null}

      <p className="mt-5 text-sm font-semibold">Izaberite vreme</p>
      {isLoading ? (
        <p role="status" className="text-muted mt-3">
          Učitavanje termina…
        </p>
      ) : null}
      {!isLoading && slots.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => {
            const selected = selectedTime === slot.value;
            return (
              <button
                key={slot.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onTimeChange(slot.value)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 font-semibold',
                  focusRingClassName,
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface hover:border-primary',
                )}
              >
                {selected ? <Check aria-hidden size={15} /> : null}
                {slot.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div aria-live="polite" className="text-muted mt-3 min-h-6 text-sm">
        {loadError ? <p className="text-red-700">{loadError}</p> : null}
        {!loadError && selectedDate && !isLoading && slots.length === 0 ? (
          <p>Nema dostupnih termina za izabrani datum.</p>
        ) : null}
        {!availability.orderAcceptingEnabled ? (
          <p className="text-red-700">
            Pekara trenutno ne prima nove porudžbine.
          </p>
        ) : null}
      </div>
      {timeError ? (
        <p className="mt-2 text-sm text-red-700">{timeError.message}</p>
      ) : null}
    </fieldset>
  );
}

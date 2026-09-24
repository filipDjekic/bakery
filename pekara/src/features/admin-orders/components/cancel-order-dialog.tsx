'use client';

import { useRef } from 'react';

type Props = {
  action: (formData: FormData) => void;
  currentStatus: string;
  orderId: string;
  pending: boolean;
};

export function CancelOrderDialog({
  action,
  currentStatus,
  orderId,
  pending,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => dialogRef.current?.showModal()}
        className="min-h-11 w-full rounded-lg border border-red-700 px-5 py-2.5 font-semibold text-red-800 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        Otkaži porudžbinu
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="cancel-order-title"
        aria-describedby="cancel-order-description"
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl p-0 shadow-xl backdrop:bg-black/50"
      >
        <form action={action} className="p-6">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="currentStatus" value={currentStatus} />
          <input type="hidden" name="targetStatus" value="CANCELLED" />
          <h2 id="cancel-order-title" className="text-xl font-bold">
            Otkazivanje porudžbine
          </h2>
          <p id="cancel-order-description" className="text-muted mt-2">
            Unesite razlog. Ova promena je terminalna.
          </p>
          <label
            className="mt-5 block font-medium"
            htmlFor="cancellationReason"
          >
            Razlog otkazivanja
          </label>
          <textarea
            autoFocus
            required
            maxLength={300}
            id="cancellationReason"
            name="cancellationReason"
            aria-describedby="cancellationReason-description"
            className="border-border focus-visible:ring-primary mt-2 block min-h-28 w-full rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
          />
          <p
            id="cancellationReason-description"
            className="text-muted mt-1 text-sm"
          >
            Najviše 300 karaktera.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="border-border focus-visible:ring-primary min-h-11 rounded-lg border px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Odustani
            </button>
            <button
              disabled={pending}
              className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
            >
              Potvrdi otkazivanje
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

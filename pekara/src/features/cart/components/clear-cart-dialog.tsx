'use client';

import { useRef } from 'react';

import { useCartStore } from '../store/cart-store';

export function ClearCartDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const clear = useCartStore((state) => state.clear);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function confirmClear() {
    clear();
    closeDialog();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="focus-visible:ring-primary mt-4 min-h-11 w-full rounded-md px-4 py-2 text-sm font-semibold text-red-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Isprazni korpu
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="clear-cart-title"
        aria-describedby="clear-cart-description"
        className="border-border bg-surface text-foreground m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border p-0 shadow-xl backdrop:bg-zinc-950/50"
        onCancel={closeDialog}
      >
        <div className="p-6">
          <h2 id="clear-cart-title" className="text-xl font-semibold">
            Isprazniti korpu?
          </h2>
          <p id="clear-cart-description" className="text-muted mt-3 leading-7">
            Svi izabrani proizvodi biće uklonjeni iz korpe.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              className="border-border focus-visible:ring-primary min-h-11 rounded-md border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Odustani
            </button>
            <button
              type="button"
              onClick={confirmClear}
              className="min-h-11 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Isprazni korpu
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { toast } from '@/lib/toast';

import { setProductActive } from '../actions/set-product-active';
import { setProductAvailable } from '../actions/set-product-available';

type ProductTogglesProps = {
  id: string;
  updatedAt: string;
  categoryIsActive: boolean;
  isActive: boolean;
  isAvailable: boolean;
};

export function ProductToggles({
  id,
  isActive,
  isAvailable,
  updatedAt,
  categoryIsActive,
}: ProductTogglesProps) {
  const [version, setVersion] = useState(updatedAt);
  const dialogLabel = useId();
  const confirm = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(isActive);
  const [available, setAvailable] = useState(isAvailable);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function change(kind: 'active' | 'available', value: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        if (kind === 'active') {
          const result = await setProductActive(id, value, version);
          setVersion(result.updatedAt);
          setActive(value);
          toast.success(
            value ? 'Proizvod je aktiviran.' : 'Proizvod je deaktiviran.',
          );
        } else {
          const result = await setProductAvailable(id, value, version);
          setVersion(result.updatedAt);
          setAvailable(value);
          toast.success(
            value ? 'Proizvod je dostupan.' : 'Proizvod nije dostupan.',
          );
        }
      } catch {
        toast.error('Promena nije sačuvana. Pokušajte ponovo.');
        setError('Promena nije sačuvana. Osvežite podatke i pokušajte ponovo.');
      }
    });
  }
  return (
    <div className="flex min-w-44 flex-col gap-2">
      {!categoryIsActive ? (
        <p className="text-xs text-amber-800">
          Skriven: kategorija nije aktivna.
        </p>
      ) : null}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          disabled={pending || (!categoryIsActive && !active)}
          onChange={(event) => {
            if (!event.target.checked) confirm.current?.showModal();
            else change('active', true);
          }}
        />{' '}
        Aktivan
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={available}
          disabled={pending || (!categoryIsActive && !available)}
          onChange={(event) => change('available', event.target.checked)}
        />{' '}
        Dostupan
      </label>
      <dialog
        ref={confirm}
        aria-labelledby={`deactivate-${dialogLabel}`}
        className="m-auto max-w-sm rounded-xl p-6 shadow-xl backdrop:bg-black/45"
      >
        <h2 id={`deactivate-${dialogLabel}`} className="text-lg font-bold">
          Sakrij proizvod iz ponude?
        </h2>
        <p className="text-muted mt-3">
          Kupci više neće moći da poruče ovaj proizvod.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            className="border-control min-h-11 rounded-lg border px-4"
            onClick={() => confirm.current?.close()}
          >
            Odustani
          </button>
          <button
            type="button"
            className="bg-primary min-h-11 rounded-lg px-4 font-bold text-white"
            onClick={() => {
              confirm.current?.close();
              change('active', false);
            }}
          >
            Deaktiviraj
          </button>
        </div>
      </dialog>
      {error ? (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}

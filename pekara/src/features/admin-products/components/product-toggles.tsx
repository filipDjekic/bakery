'use client';

import { useState, useTransition } from 'react';

import { setProductActive } from '../actions/set-product-active';
import { setProductAvailable } from '../actions/set-product-available';

type ProductTogglesProps = {
  id: string;
  isActive: boolean;
  isAvailable: boolean;
};

export function ProductToggles({
  id,
  isActive,
  isAvailable,
}: ProductTogglesProps) {
  const [active, setActive] = useState(isActive);
  const [available, setAvailable] = useState(isAvailable);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function change(kind: 'active' | 'available', value: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        if (kind === 'active') {
          await setProductActive(id, value);
          setActive(value);
        } else {
          await setProductAvailable(id, value);
          setAvailable(value);
        }
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Promena nije sačuvana.',
        );
      }
    });
  }
  return (
    <div className="flex min-w-44 flex-col gap-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          disabled={pending}
          onChange={(event) => change('active', event.target.checked)}
        />{' '}
        Aktivan
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={available}
          disabled={pending}
          onChange={(event) => change('available', event.target.checked)}
        />{' '}
        Dostupan
      </label>
      {error ? (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}

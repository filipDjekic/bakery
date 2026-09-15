'use client';

import { useState } from 'react';

import { CART_LIMITS } from '@/config/limits';

import { useCartStore } from '../store/cart-store';
import type { CartActionResult } from '../types';

type CartQuantityControlsProps = {
  productId: string;
  productName: string;
  quantity: number;
};

function resultMessage(result: CartActionResult): string {
  if (result.ok) {
    return 'Količina je ažurirana.';
  }

  switch (result.reason) {
    case 'ITEM_QUANTITY_LIMIT':
      return 'Dostignuta je maksimalna količina ovog proizvoda.';
    case 'TOTAL_QUANTITY_LIMIT':
      return 'Dostignuta je maksimalna ukupna količina u korpi.';
    case 'INVALID_QUANTITY':
      return 'Izaberite dozvoljenu količinu.';
    case 'ITEM_NOT_FOUND':
      return 'Proizvod više nije u korpi.';
    case 'INVALID_ITEM':
    case 'DISTINCT_ITEM_LIMIT':
      return 'Količinu trenutno nije moguće promeniti.';
  }
}

export function CartQuantityControls({
  productId,
  productName,
  quantity,
}: CartQuantityControlsProps) {
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totalQuantity = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const [feedback, setFeedback] = useState('');

  const maximumSelectableQuantity = Math.min(
    CART_LIMITS.maxItemQuantity,
    quantity + (CART_LIMITS.maxTotalQuantity - totalQuantity),
  );
  const quantityOptions = Array.from(
    { length: maximumSelectableQuantity },
    (_, index) => index + 1,
  );
  const cannotIncrement =
    quantity >= CART_LIMITS.maxItemQuantity ||
    totalQuantity >= CART_LIMITS.maxTotalQuantity;

  function runQuantityAction(action: () => CartActionResult) {
    setFeedback(resultMessage(action()));
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={quantity <= CART_LIMITS.minItemQuantity}
          onClick={() => runQuantityAction(() => decrement(productId))}
          aria-label={`Smanji količinu proizvoda ${productName}`}
          className="border-border hover:border-primary hover:text-primary focus-visible:ring-primary inline-flex size-10 items-center justify-center rounded-md border text-lg font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">−</span>
        </button>

        <label className="sr-only" htmlFor={`quantity-${productId}`}>
          Količina proizvoda {productName}
        </label>
        <select
          id={`quantity-${productId}`}
          value={quantity}
          onChange={(event) =>
            runQuantityAction(() =>
              setQuantity(productId, Number(event.target.value)),
            )
          }
          className="border-border focus-visible:ring-primary h-10 min-w-16 rounded-md border bg-white px-2 text-center text-sm font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {quantityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={cannotIncrement}
          onClick={() => runQuantityAction(() => increment(productId))}
          aria-label={`Povećaj količinu proizvoda ${productName}`}
          className="border-border hover:border-primary hover:text-primary focus-visible:ring-primary inline-flex size-10 items-center justify-center rounded-md border text-lg font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">+</span>
        </button>

        <button
          type="button"
          onClick={() => removeItem(productId)}
          className="ml-auto min-h-10 rounded-md px-2 text-sm font-semibold text-red-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:outline-none"
        >
          Ukloni
          <span className="sr-only"> {productName} iz korpe</span>
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-muted mt-2 min-h-5 text-sm"
      >
        {feedback}
      </p>
    </div>
  );
}

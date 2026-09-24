'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';

import { CART_LIMITS } from '@/config/limits';
import { useCartHydration } from '@/features/cart/hooks/use-cart-hydration';
import { useCartStore } from '@/features/cart/store/cart-store';
import type { AddCartItemInput, CartActionResult } from '@/features/cart/types';

type CompactCartControlProps = {
  item: AddCartItemInput;
  isAvailable: boolean;
};

function feedbackFor(result: CartActionResult, productName: string): string {
  if (result.ok) return `Količina proizvoda ${productName} je ažurirana.`;
  switch (result.reason) {
    case 'ITEM_QUANTITY_LIMIT':
      return 'Dostignuta je maksimalna količina ovog proizvoda.';
    case 'DISTINCT_ITEM_LIMIT':
      return 'Korpa sadrži maksimalan broj različitih proizvoda.';
    case 'TOTAL_QUANTITY_LIMIT':
      return 'Dostignuta je maksimalna ukupna količina u korpi.';
    case 'ITEM_NOT_FOUND':
      return 'Proizvod više nije u korpi.';
    case 'INVALID_ITEM':
    case 'INVALID_QUANTITY':
      return 'Količinu trenutno nije moguće promeniti.';
  }
}

export function CompactCartControl({
  item,
  isAvailable,
}: CompactCartControlProps) {
  const hasHydrated = useCartHydration();
  const cartItem = useCartStore((state) =>
    state.items.find((candidate) => candidate.productId === item.productId),
  );
  const totalQuantity = useCartStore((state) =>
    state.items.reduce((total, candidate) => total + candidate.quantity, 0),
  );
  const addItem = useCartStore((state) => state.addItem);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const removeItem = useCartStore((state) => state.removeItem);
  const [feedback, setFeedback] = useState('');
  const quantity = hasHydrated ? (cartItem?.quantity ?? 0) : 0;
  const cannotAdd =
    !isAvailable ||
    quantity >= CART_LIMITS.maxItemQuantity ||
    totalQuantity >= CART_LIMITS.maxTotalQuantity;

  function run(action: () => CartActionResult) {
    setFeedback(feedbackFor(action(), item.name));
  }

  if (!isAvailable) {
    return (
      <span className="bg-surface-muted text-muted border-border inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold">
        Rasprodato
      </span>
    );
  }

  return (
    <div>
      {quantity === 0 ? (
        <button
          type="button"
          disabled={cannotAdd}
          onClick={() => run(() => addItem(item))}
          aria-label={`Dodaj ${item.name} u korpu`}
          className="bg-primary hover:bg-primary-hover focus-visible:ring-primary inline-flex size-11 items-center justify-center rounded-lg text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden size={20} />
        </button>
      ) : (
        <div className="border-border bg-surface inline-flex items-center rounded-lg border shadow-sm">
          <button
            type="button"
            onClick={() =>
              run(() =>
                quantity === 1
                  ? removeItem(item.productId)
                  : decrement(item.productId),
              )
            }
            aria-label={`Smanji količinu proizvoda ${item.name}`}
            className="hover:bg-surface-muted focus-visible:ring-primary inline-flex size-11 items-center justify-center rounded-l-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Minus aria-hidden size={17} />
          </button>
          <output
            aria-label={`Količina proizvoda ${item.name}`}
            className="min-w-8 text-center text-sm font-bold tabular-nums"
          >
            {quantity}
          </output>
          <button
            type="button"
            disabled={cannotAdd}
            onClick={() => run(() => increment(item.productId))}
            aria-label={`Povećaj količinu proizvoda ${item.name}`}
            className="hover:bg-surface-muted focus-visible:ring-primary inline-flex size-11 items-center justify-center rounded-r-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus aria-hidden size={17} />
          </button>
        </div>
      )}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback}
      </p>
    </div>
  );
}

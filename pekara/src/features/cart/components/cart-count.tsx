'use client';

import { useCartHydration } from '../hooks/use-cart-hydration';
import { useCartStore } from '../store/cart-store';

export function CartCount() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartHydration();
  const itemCount = hasHydrated
    ? items.reduce((total, item) => total + item.quantity, 0)
    : 0;

  return (
    <span
      aria-label={`Korpa, trenutno ${itemCount} artikala`}
      className="inline-flex items-center"
    >
      Korpa
      <span
        aria-hidden="true"
        className="bg-surface-muted text-primary ml-2 min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums"
      >
        {itemCount}
      </span>
    </span>
  );
}

'use client';

import { ShoppingBasket } from 'lucide-react';

import { useCartHydration } from '../hooks/use-cart-hydration';
import { getCartItemCount } from '../lib/cart-totals';
import { openCartDrawer } from '../lib/cart-drawer-events';
import { useCartStore } from '../store/cart-store';

export function CartTrigger() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartHydration();
  const count = hasHydrated ? getCartItemCount(items) : 0;

  return (
    <button
      type="button"
      onClick={openCartDrawer}
      aria-label={`Otvori korpu, trenutno ${count} artikala`}
      className="border-border bg-surface text-foreground hover:border-primary focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <ShoppingBasket aria-hidden size={19} />
      <span>Korpa</span>
      <span
        aria-hidden="true"
        className="bg-surface-muted text-primary min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums"
      >
        {count}
      </span>
    </button>
  );
}

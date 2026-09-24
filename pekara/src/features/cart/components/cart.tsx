'use client';

import { useCartHydration } from '../hooks/use-cart-hydration';
import { useCartStore } from '../store/cart-store';
import { getCartItemCount, getCartTotalMinor } from '../lib/cart-totals';
import { CartEmptyState } from './cart-empty-state';
import { CartItem } from './cart-item';
import { CartSummary } from './cart-summary';

export function Cart() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartHydration();

  if (!hasHydrated) {
    return (
      <div role="status" aria-busy="true" className="animate-pulse">
        <span className="sr-only">Učitavanje korpe</span>
        <div className="border-border bg-surface-muted h-40 rounded-xl border" />
      </div>
    );
  }

  if (items.length === 0) {
    return <CartEmptyState />;
  }

  const itemCount = getCartItemCount(items);
  const totalMinor = getCartTotalMinor(items);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ul aria-label="Proizvodi u korpi" className="space-y-4">
        {items.map((item) => (
          <CartItem key={item.productId} item={item} />
        ))}
      </ul>

      <CartSummary totalMinor={totalMinor} itemCount={itemCount} />
    </div>
  );
}

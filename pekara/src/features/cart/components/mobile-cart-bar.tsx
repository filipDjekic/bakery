'use client';

import { usePathname } from 'next/navigation';

import { formatRsd } from '@/lib/money';

import { useCartHydration } from '../hooks/use-cart-hydration';
import { openCartDrawer } from '../lib/cart-drawer-events';
import { getCartItemCount, getCartTotalMinor } from '../lib/cart-totals';
import { useCartStore } from '../store/cart-store';

const hiddenPaths = ['/korpa', '/checkout', '/porudzbina', '/admin'];

export function MobileCartBar() {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartHydration();
  if (
    !hasHydrated ||
    items.length === 0 ||
    hiddenPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  )
    return null;

  const count = getCartItemCount(items);
  return (
    <>
      <div className="h-24 lg:hidden" aria-hidden="true" />
      <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          onClick={openCartDrawer}
          className="bg-primary focus-visible:ring-primary mx-auto flex min-h-12 w-full max-w-lg items-center justify-between rounded-xl px-4 font-bold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span>Korpa · {count}</span>
          <span>{formatRsd(getCartTotalMinor(items))}</span>
        </button>
      </div>
    </>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ProductImagePlaceholder } from '@/features/catalog/components/product-image-placeholder';
import { formatRsd } from '@/lib/money';

import { useCartHydration } from '../hooks/use-cart-hydration';
import { OPEN_CART_DRAWER_EVENT } from '../lib/cart-drawer-events';
import { getCartItemCount, getCartTotalMinor } from '../lib/cart-totals';
import { useCartStore } from '../store/cart-store';
import { CartQuantityControls } from './cart-quantity-controls';

const focusableSelector =
  'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartHydration();

  useEffect(() => {
    function open() {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setIsOpen(true);
    }
    window.addEventListener(OPEN_CART_DRAWER_EVENT, open);
    return () => window.removeEventListener(OPEN_CART_DRAWER_EVENT, open);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const count = hasHydrated ? getCartItemCount(items) : 0;
  const totalMinor = hasHydrated ? getCartTotalMinor(items) : 0;
  const close = () => setIsOpen(false);

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Zatvori korpu"
        onClick={close}
        className="motion-safe:animate-in motion-safe:fade-in absolute inset-0 bg-black/45"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="bg-background motion-safe:animate-in motion-safe:slide-in-from-right absolute inset-y-0 right-0 flex w-[min(94vw,28rem)] flex-col shadow-2xl"
      >
        <header className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 id="cart-drawer-title" className="text-xl font-bold">
              Korpa
            </h2>
            <p className="text-muted text-sm">{count} artikala</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Zatvori korpu"
            className="hover:bg-surface-muted focus-visible:ring-primary inline-flex size-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          >
            <X aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!hasHydrated ? (
            <p role="status">Učitavanje korpe…</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold">Korpa je prazna.</p>
              <Link
                href="/proizvodi"
                onClick={close}
                className="bg-primary focus-visible:ring-primary mt-5 inline-flex min-h-11 items-center rounded-lg px-5 font-bold text-white focus-visible:ring-2 focus-visible:outline-none"
              >
                Pogledaj proizvode
              </Link>
            </div>
          ) : (
            <ul aria-label="Proizvodi u korpi" className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="border-border rounded-xl border p-3"
                >
                  <div className="flex gap-3">
                    <div className="bg-surface-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <ProductImagePlaceholder productName={item.name} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold break-words">{item.name}</p>
                      <p className="text-muted mt-1 text-sm">
                        {formatRsd(item.displayPriceMinor)} po komadu
                      </p>
                    </div>
                    <p className="font-bold">
                      {formatRsd(item.displayPriceMinor * item.quantity)}
                    </p>
                  </div>
                  <CartQuantityControls
                    productId={item.productId}
                    productName={item.name}
                    quantity={item.quantity}
                    compact
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasHydrated && items.length > 0 ? (
          <footer className="border-border border-t p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Ukupno</span>
              <span>{formatRsd(totalMinor)}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/korpa"
                onClick={close}
                className="border-border focus-visible:ring-primary inline-flex min-h-11 items-center justify-center rounded-lg border px-4 font-bold focus-visible:ring-2 focus-visible:outline-none"
              >
                Idi na korpu
              </Link>
              <Link
                href="/checkout"
                onClick={close}
                className="bg-primary focus-visible:ring-primary inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-center font-bold text-white focus-visible:ring-2 focus-visible:outline-none"
              >
                Nastavi na poručivanje
              </Link>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

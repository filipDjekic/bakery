'use client';

import { useState } from 'react';

import { CART_LIMITS } from '@/config/limits';
import { useCartStore } from '@/features/cart/store/cart-store';
import type { AddCartItemInput } from '@/features/cart/types';

export function ProductDetailCartControl({
  item,
  isAvailable,
}: {
  item: AddCartItemInput;
  isAvailable: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState('');
  const addItem = useCartStore((state) => state.addItem);
  const cartQuantity = useCartStore(
    (state) =>
      state.items.find((entry) => entry.productId === item.productId)
        ?.quantity ?? 0,
  );
  const cartTotalQuantity = useCartStore((state) =>
    state.items.reduce((total, entry) => total + entry.quantity, 0),
  );
  const maxAddable = Math.max(
    0,
    Math.min(
      CART_LIMITS.maxItemQuantity - cartQuantity,
      CART_LIMITS.maxTotalQuantity - cartTotalQuantity,
    ),
  );

  function add() {
    const result = addItem(item, quantity);
    setFeedback(
      result.ok
        ? `${quantity} kom. proizvoda ${item.name} je dodato u korpu.`
        : 'Izabranu količinu trenutno nije moguće dodati.',
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="border-border inline-flex items-center rounded-lg border">
          <button
            type="button"
            disabled={!isAvailable || quantity <= 1}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label={`Smanji količinu proizvoda ${item.name}`}
            className="focus-visible:ring-primary inline-flex size-11 items-center justify-center text-xl font-bold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
          >
            −
          </button>
          <output
            aria-label={`Izabrana količina proizvoda ${item.name}`}
            className="min-w-12 text-center font-bold tabular-nums"
          >
            {quantity}
          </output>
          <button
            type="button"
            disabled={!isAvailable || quantity >= maxAddable}
            onClick={() =>
              setQuantity((value) => Math.min(maxAddable, value + 1))
            }
            aria-label={`Povećaj količinu proizvoda ${item.name}`}
            className="focus-visible:ring-primary inline-flex size-11 items-center justify-center text-xl font-bold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={!isAvailable || maxAddable === 0 || quantity > maxAddable}
          onClick={add}
          className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 flex-1 rounded-lg px-5 font-bold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isAvailable
            ? maxAddable === 0
              ? 'Maksimalna količina je u korpi'
              : 'Dodaj u korpu'
            : 'Nije dostupno'}
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="text-muted mt-2 min-h-5 text-sm"
      >
        {feedback}
      </p>
    </div>
  );
}

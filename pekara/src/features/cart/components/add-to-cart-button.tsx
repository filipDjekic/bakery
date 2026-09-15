'use client';

import { useState } from 'react';

import { useCartStore } from '../store/cart-store';
import type {
  AddCartItemInput,
  CartActionResult,
  CartLimitReason,
} from '../types';

type AddToCartButtonProps = {
  item: AddCartItemInput;
  isAvailable: boolean;
  className?: string;
};

function limitMessage(reason: CartLimitReason): string {
  switch (reason) {
    case 'ITEM_QUANTITY_LIMIT':
      return 'Dostignuta je maksimalna količina ovog proizvoda.';
    case 'DISTINCT_ITEM_LIMIT':
      return 'Korpa već sadrži maksimalan broj različitih proizvoda.';
    case 'TOTAL_QUANTITY_LIMIT':
      return 'Dostignuta je maksimalna ukupna količina u korpi.';
    case 'INVALID_ITEM':
    case 'INVALID_QUANTITY':
      return 'Proizvod trenutno nije moguće dodati u korpu.';
    case 'ITEM_NOT_FOUND':
      return 'Proizvod nije pronađen u korpi.';
  }
}

function feedbackMessage(
  result: CartActionResult,
  productName: string,
  quantity: number,
): string {
  return result.ok
    ? `${productName} je dodat u korpu. Količina u korpi: ${quantity}.`
    : limitMessage(result.reason);
}

export function AddToCartButton({
  item,
  isAvailable,
  className = '',
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [feedback, setFeedback] = useState('');

  function handleAdd() {
    const result = addItem(item);
    const quantity =
      useCartStore
        .getState()
        .items.find((cartItem) => cartItem.productId === item.productId)
        ?.quantity ?? 0;

    setFeedback(feedbackMessage(result, item.name, quantity));
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={!isAvailable}
        onClick={handleAdd}
        aria-label={
          isAvailable
            ? `Dodaj ${item.name} u korpu`
            : `${item.name} je rasprodat`
        }
        className="bg-primary hover:bg-primary-hover focus-visible:ring-primary inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:opacity-70"
      >
        {isAvailable ? 'Dodaj u korpu' : 'Nije dostupno'}
      </button>

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

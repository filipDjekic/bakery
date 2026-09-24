'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { CART_LIMITS } from '../../../config/limits.ts';
import type {
  AddCartItemInput,
  CartActionResult,
  CartItem,
  CartState,
  PersistedCartState,
} from '../types.ts';
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  cartStorage,
} from './cart-storage.ts';

const SUCCESS: CartActionResult = { ok: true };

function failure(
  reason: Extract<CartActionResult, { ok: false }>['reason'],
): CartActionResult {
  return { ok: false, reason };
}

function totalQuantity(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function isValidAddItem(item: AddCartItemInput): boolean {
  return (
    item.productId.length > 0 &&
    item.name.length > 0 &&
    (item.imageUrl === null || typeof item.imageUrl === 'string') &&
    Number.isSafeInteger(item.displayPriceMinor) &&
    item.displayPriceMinor >= 0 &&
    item.displayPriceMinor <=
      Number.MAX_SAFE_INTEGER / CART_LIMITS.maxItemQuantity
  );
}

function validateQuantity(quantity: number): CartActionResult | undefined {
  if (!Number.isInteger(quantity) || quantity < CART_LIMITS.minItemQuantity) {
    return failure('INVALID_QUANTITY');
  }

  if (quantity > CART_LIMITS.maxItemQuantity) {
    return failure('ITEM_QUANTITY_LIMIT');
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(item, quantity = 1) {
        if (!isValidAddItem(item)) {
          return failure('INVALID_ITEM');
        }

        const quantityFailure = validateQuantity(quantity);
        if (quantityFailure) {
          return quantityFailure;
        }

        const { items } = get();
        const existingItem = items.find(
          (cartItem) => cartItem.productId === item.productId,
        );
        const nextItemQuantity = (existingItem?.quantity ?? 0) + quantity;

        if (nextItemQuantity > CART_LIMITS.maxItemQuantity) {
          return failure('ITEM_QUANTITY_LIMIT');
        }

        if (!existingItem && items.length >= CART_LIMITS.maxDistinctItems) {
          return failure('DISTINCT_ITEM_LIMIT');
        }

        if (totalQuantity(items) + quantity > CART_LIMITS.maxTotalQuantity) {
          return failure('TOTAL_QUANTITY_LIMIT');
        }

        set({
          items: existingItem
            ? items.map((cartItem) =>
                cartItem.productId === item.productId
                  ? {
                      ...cartItem,
                      ...item,
                      quantity: nextItemQuantity,
                    }
                  : cartItem,
              )
            : [...items, { ...item, quantity }],
        });

        return SUCCESS;
      },

      removeItem(productId) {
        const { items } = get();

        if (!items.some((item) => item.productId === productId)) {
          return failure('ITEM_NOT_FOUND');
        }

        set({ items: items.filter((item) => item.productId !== productId) });
        return SUCCESS;
      },

      setQuantity(productId, quantity) {
        const quantityFailure = validateQuantity(quantity);
        if (quantityFailure) {
          return quantityFailure;
        }

        const { items } = get();
        const item = items.find((cartItem) => cartItem.productId === productId);

        if (!item) {
          return failure('ITEM_NOT_FOUND');
        }

        if (
          totalQuantity(items) - item.quantity + quantity >
          CART_LIMITS.maxTotalQuantity
        ) {
          return failure('TOTAL_QUANTITY_LIMIT');
        }

        set({
          items: items.map((cartItem) =>
            cartItem.productId === productId
              ? { ...cartItem, quantity }
              : cartItem,
          ),
        });
        return SUCCESS;
      },

      increment(productId) {
        const item = get().items.find(
          (cartItem) => cartItem.productId === productId,
        );
        return item
          ? get().setQuantity(productId, item.quantity + 1)
          : failure('ITEM_NOT_FOUND');
      },

      decrement(productId) {
        const item = get().items.find(
          (cartItem) => cartItem.productId === productId,
        );
        return item
          ? get().setQuantity(productId, item.quantity - 1)
          : failure('ITEM_NOT_FOUND');
      },

      updateItemPrice(productId, displayPriceMinor) {
        if (!Number.isSafeInteger(displayPriceMinor) || displayPriceMinor < 0) {
          return failure('INVALID_ITEM');
        }
        const { items } = get();
        if (!items.some((item) => item.productId === productId)) {
          return failure('ITEM_NOT_FOUND');
        }
        set({
          items: items.map((item) =>
            item.productId === productId
              ? { ...item, displayPriceMinor }
              : item,
          ),
        });
        return SUCCESS;
      },

      clear() {
        set({ items: [] });
        return SUCCESS;
      },
    }),
    {
      name: CART_STORAGE_KEY,
      version: CART_STORAGE_VERSION,
      storage: cartStorage,
      partialize: (state): PersistedCartState => ({ items: state.items }),
    },
  ),
);

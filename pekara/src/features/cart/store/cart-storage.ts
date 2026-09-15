import type { PersistStorage, StorageValue } from 'zustand/middleware';

import { CART_LIMITS } from '../../../config/limits.ts';
import type { CartItem, PersistedCartState } from '../types.ts';

export const CART_STORAGE_KEY = 'pekara-cart';
export const CART_STORAGE_VERSION = 1;

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.productId === 'string' &&
    value.productId.length > 0 &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    (value.imageUrl === null || typeof value.imageUrl === 'string') &&
    typeof value.displayPriceMinor === 'number' &&
    Number.isSafeInteger(value.displayPriceMinor) &&
    value.displayPriceMinor >= 0 &&
    typeof value.quantity === 'number' &&
    Number.isInteger(value.quantity) &&
    value.quantity >= CART_LIMITS.minItemQuantity &&
    value.quantity <= CART_LIMITS.maxItemQuantity
  );
}

function isValidItems(value: unknown): value is CartItem[] {
  if (!Array.isArray(value) || value.length > CART_LIMITS.maxDistinctItems) {
    return false;
  }

  const productIds = new Set<string>();
  let totalQuantity = 0;
  let totalMinor = 0;

  for (const item of value) {
    if (!isValidCartItem(item) || productIds.has(item.productId)) {
      return false;
    }

    productIds.add(item.productId);
    totalQuantity += item.quantity;
    totalMinor += item.displayPriceMinor * item.quantity;

    if (!Number.isSafeInteger(totalMinor)) {
      return false;
    }
  }

  return totalQuantity <= CART_LIMITS.maxTotalQuantity;
}

function parseStoredValue(rawValue: string): StorageValue<PersistedCartState> {
  const parsed: unknown = JSON.parse(rawValue);

  if (
    !isRecord(parsed) ||
    parsed.version !== CART_STORAGE_VERSION ||
    !isRecord(parsed.state) ||
    !isValidItems(parsed.state.items)
  ) {
    throw new TypeError('Invalid or unsupported persisted cart state.');
  }

  return {
    version: CART_STORAGE_VERSION,
    state: { items: parsed.state.items },
  };
}

function getBrowserStorage(): BrowserStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function createCartStorage(
  getStorage: () => BrowserStorage | undefined = getBrowserStorage,
): PersistStorage<PersistedCartState> {
  return {
    getItem(name) {
      let storage: BrowserStorage | undefined;

      try {
        storage = getStorage();
      } catch {
        return null;
      }

      if (!storage) {
        return null;
      }

      try {
        const rawValue = storage.getItem(name);
        return rawValue === null ? null : parseStoredValue(rawValue);
      } catch {
        try {
          storage.removeItem(name);
        } catch {
          // Storage can be unavailable even when its getter succeeds.
        }

        return null;
      }
    },
    setItem(name, value) {
      try {
        getStorage()?.setItem(name, JSON.stringify(value));
      } catch {
        // The in-memory store remains usable when persistence is unavailable.
      }
    },
    removeItem(name) {
      try {
        getStorage()?.removeItem(name);
      } catch {
        // Clearing the in-memory store must not fail with localStorage.
      }
    },
  };
}

export const cartStorage = createCartStorage();

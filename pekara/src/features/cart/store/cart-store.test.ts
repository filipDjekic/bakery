import assert from 'node:assert/strict';
import { beforeEach, test } from 'vitest';

import { CART_LIMITS } from '../../../config/limits.ts';
import type { AddCartItemInput } from '../types.ts';
import { useCartStore } from './cart-store.ts';
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  createCartStorage,
} from './cart-storage.ts';

function product(index: number): AddCartItemInput {
  return {
    productId: `product-${index}`,
    name: `Product ${index}`,
    imageUrl: null,
    displayPriceMinor: index * 100,
  };
}

beforeEach(() => {
  useCartStore.getState().clear();
});

test('adds, updates and removes cart items', () => {
  assert.deepEqual(useCartStore.getState().addItem(product(1), 2), {
    ok: true,
  });
  assert.deepEqual(useCartStore.getState().addItem(product(1)), { ok: true });
  assert.equal(useCartStore.getState().items[0]?.quantity, 3);

  assert.deepEqual(useCartStore.getState().increment('product-1'), {
    ok: true,
  });
  assert.equal(useCartStore.getState().items[0]?.quantity, 4);

  assert.deepEqual(useCartStore.getState().decrement('product-1'), {
    ok: true,
  });
  assert.equal(useCartStore.getState().items[0]?.quantity, 3);

  assert.deepEqual(useCartStore.getState().setQuantity('product-1', 7), {
    ok: true,
  });
  assert.equal(useCartStore.getState().items[0]?.quantity, 7);

  assert.deepEqual(
    useCartStore.getState().updateItemPrice('product-1', 17500),
    { ok: true },
  );
  assert.equal(useCartStore.getState().items[0]?.displayPriceMinor, 17500);

  assert.deepEqual(useCartStore.getState().removeItem('product-1'), {
    ok: true,
  });
  assert.deepEqual(useCartStore.getState().items, []);
});

test('enforces per-item, distinct-item and total quantity limits', () => {
  assert.equal(useCartStore.getState().addItem(product(1), 0).ok, false);
  assert.equal(
    useCartStore.getState().addItem(product(1), CART_LIMITS.maxItemQuantity + 1)
      .ok,
    false,
  );

  for (let index = 1; index <= CART_LIMITS.maxDistinctItems; index += 1) {
    assert.equal(useCartStore.getState().addItem(product(index)).ok, true);
  }
  assert.deepEqual(useCartStore.getState().addItem(product(21)), {
    ok: false,
    reason: 'DISTINCT_ITEM_LIMIT',
  });

  useCartStore.getState().clear();
  assert.equal(useCartStore.getState().addItem(product(1), 20).ok, true);
  assert.equal(useCartStore.getState().addItem(product(2), 20).ok, true);
  assert.equal(useCartStore.getState().addItem(product(3), 10).ok, true);
  assert.deepEqual(useCartStore.getState().increment('product-3'), {
    ok: false,
    reason: 'TOTAL_QUANTITY_LIMIT',
  });
  assert.equal(useCartStore.getState().items[2]?.quantity, 10);
  assert.deepEqual(useCartStore.getState().setQuantity('product-3', 11), {
    ok: false,
    reason: 'TOTAL_QUANTITY_LIMIT',
  });
  assert.equal(useCartStore.getState().items[2]?.quantity, 10);
});

test('keeps quantities unchanged at the minimum and per-item boundaries', () => {
  assert.deepEqual(useCartStore.getState().addItem(product(1)), { ok: true });

  assert.deepEqual(useCartStore.getState().decrement('product-1'), {
    ok: false,
    reason: 'INVALID_QUANTITY',
  });
  assert.equal(useCartStore.getState().items[0]?.quantity, 1);

  assert.deepEqual(
    useCartStore
      .getState()
      .setQuantity('product-1', CART_LIMITS.maxItemQuantity + 1),
    { ok: false, reason: 'ITEM_QUANTITY_LIMIT' },
  );
  assert.equal(useCartStore.getState().items[0]?.quantity, 1);
});

test('rejects unsafe item prices and operations on missing products', () => {
  assert.deepEqual(
    useCartStore.getState().addItem({
      ...product(1),
      displayPriceMinor: Number.MAX_SAFE_INTEGER,
    }),
    { ok: false, reason: 'INVALID_ITEM' },
  );
  assert.deepEqual(useCartStore.getState().increment('missing'), {
    ok: false,
    reason: 'ITEM_NOT_FOUND',
  });
  assert.deepEqual(useCartStore.getState().removeItem('missing'), {
    ok: false,
    reason: 'ITEM_NOT_FOUND',
  });
  assert.deepEqual(useCartStore.getState().updateItemPrice('missing', 100), {
    ok: false,
    reason: 'ITEM_NOT_FOUND',
  });
  assert.deepEqual(useCartStore.getState().updateItemPrice('product-1', -1), {
    ok: false,
    reason: 'INVALID_ITEM',
  });
});

test('clear empties the cart', () => {
  useCartStore.getState().addItem(product(1));
  useCartStore.getState().clear();
  assert.deepEqual(useCartStore.getState().items, []);
});

test('storage resets malformed and old persisted payloads', () => {
  const values = new Map<string, string>();
  const storage = createCartStorage(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }));

  for (const invalidValue of [
    '{malformed',
    JSON.stringify({ version: CART_STORAGE_VERSION - 1, state: { items: [] } }),
    JSON.stringify({
      version: CART_STORAGE_VERSION,
      state: { items: [{ productId: 'broken' }] },
    }),
  ]) {
    values.set(CART_STORAGE_KEY, invalidValue);
    assert.equal(storage.getItem(CART_STORAGE_KEY), null);
    assert.equal(values.has(CART_STORAGE_KEY), false);
  }
});

test('storage failures do not break in-memory cart behavior', () => {
  const unavailableStorage = createCartStorage(() => {
    throw new Error('Storage unavailable');
  });

  assert.equal(unavailableStorage.getItem(CART_STORAGE_KEY), null);
  assert.doesNotThrow(() =>
    unavailableStorage.setItem(CART_STORAGE_KEY, {
      version: CART_STORAGE_VERSION,
      state: { items: [] },
    }),
  );
  assert.doesNotThrow(() => unavailableStorage.removeItem(CART_STORAGE_KEY));
});

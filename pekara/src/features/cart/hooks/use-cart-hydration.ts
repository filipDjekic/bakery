'use client';

import { useSyncExternalStore } from 'react';

import { useCartStore } from '../store/cart-store';
import { CART_STORAGE_KEY } from '../store/cart-storage';

let listeners = 0;
function synchronizeCart(event: StorageEvent) {
  if (event.key !== CART_STORAGE_KEY && event.key !== null) return;
  if (event.newValue === null) useCartStore.setState({ items: [] });
  else void useCartStore.persist.rehydrate();
}

function subscribeToHydration(onStoreChange: () => void): () => void {
  if (listeners++ === 0) window.addEventListener('storage', synchronizeCart);
  const unsubscribeHydrate = useCartStore.persist.onHydrate(onStoreChange);
  const unsubscribeFinish =
    useCartStore.persist.onFinishHydration(onStoreChange);

  return () => {
    if (--listeners === 0)
      window.removeEventListener('storage', synchronizeCart);
    unsubscribeHydrate();
    unsubscribeFinish();
  };
}

export function useCartHydration(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    useCartStore.persist.hasHydrated,
    () => false,
  );
}

'use client';

import { useSyncExternalStore } from 'react';

import { useCartStore } from '../store/cart-store';

function subscribeToHydration(onStoreChange: () => void): () => void {
  const unsubscribeHydrate = useCartStore.persist.onHydrate(onStoreChange);
  const unsubscribeFinish =
    useCartStore.persist.onFinishHydration(onStoreChange);

  return () => {
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

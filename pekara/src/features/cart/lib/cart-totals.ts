import type { CartItem } from '../types';

export function getCartItemCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotalMinor(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + item.displayPriceMinor * item.quantity,
    0,
  );
}

export const OPEN_CART_DRAWER_EVENT = 'bakery:open-cart-drawer';

export function openCartDrawer(): void {
  window.dispatchEvent(new Event(OPEN_CART_DRAWER_EVENT));
}

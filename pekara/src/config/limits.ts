export const CART_LIMITS = {
  minItemQuantity: 1,
  maxItemQuantity: 20,
  maxDistinctItems: 20,
  maxTotalQuantity: 50,
} as const;

export const CHECKOUT_LIMITS = {
  customerName: 100,
  customerPhone: 20,
  customerEmail: 254,
  note: 500,
} as const;

export const ORDER_RATE_LIMIT_POLICIES = [
  { limit: 5, windowSeconds: 10 * 60 },
  { limit: 20, windowSeconds: 60 * 60 },
] as const;

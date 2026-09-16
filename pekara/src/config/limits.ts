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

export const ORDER_LIMITS = {
  orderNumberAttempts: 5,
  maximumTotalMinor: 2_147_483_647,
} as const;

export const PRODUCT_LIMITS = {
  name: 120,
  slug: 140,
  description: 1000,
  maximumPriceMinor: 2_147_483_647,
  minimumSortOrder: -1_000_000,
  maximumSortOrder: 1_000_000,
} as const;

export const PRODUCT_IMAGE_LIMITS = {
  maximumBytes: 3 * 1024 * 1024,
  maximumDimension: 12_000,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const PUBLIC_CACHE_TAGS = {
  catalog: 'catalog',
  categories: 'categories',
  settings: 'settings-public',
} as const;

export function productCacheTag(productId: string): `product:${string}` {
  return `product:${productId}`;
}

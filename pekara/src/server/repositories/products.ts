import 'server-only';

import { db } from '../../prisma/db.ts';

export type OrderProduct = {
  id: string;
  name: string;
  priceMinor: number;
  isActive: boolean;
  isAvailable: boolean;
  categoryIsActive: boolean;
};

export async function getProductsForOrder(
  productIds: string[],
): Promise<OrderProduct[]> {
  if (productIds.length === 0) {
    return [];
  }

  const rows = await db.orm.public.Product.include('category')
    .where((product) => product.id.in(productIds))
    .all();

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    priceMinor: product.priceMinor,
    isActive: product.isActive,
    isAvailable: product.isAvailable,
    categoryIsActive: product.category.isActive,
  }));
}

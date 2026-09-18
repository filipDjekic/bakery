import 'server-only';

import { db } from '../../prisma/db.ts';
import { requireAdmin } from '../auth/authorization.ts';

type AdminAuthorizer = () => Promise<unknown>;

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  activeProductCount: number;
  updatedAt: string;
};

export type AdminCategoryDetails = AdminCategoryRow;

function toRow(category: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  products: Array<{ isActive: boolean }>;
}): AdminCategoryRow {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category.products.length,
    activeProductCount: category.products.filter((product) => product.isActive)
      .length,
    updatedAt: new Date(category.updatedAt).toISOString(),
  };
}

export async function getAdminCategories(
  authorize: AdminAuthorizer = requireAdmin,
): Promise<AdminCategoryRow[]> {
  await authorize();
  const rows = await db.orm.public.Category.include('products', (products) =>
    products.select('isActive'),
  )
    .orderBy((category) => category.sortOrder.asc())
    .orderBy((category) => category.name.asc())
    .orderBy((category) => category.id.asc())
    .all();
  return rows.map(toRow);
}

export async function getAdminCategory(
  id: string,
  authorize: AdminAuthorizer = requireAdmin,
): Promise<AdminCategoryDetails | null> {
  await authorize();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    return null;
  const category = await db.orm.public.Category.include(
    'products',
    (products) => products.select('isActive'),
  )
    .where({ id })
    .first();
  return category ? toRow(category) : null;
}

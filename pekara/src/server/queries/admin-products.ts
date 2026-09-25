import 'server-only';

import { db } from '../../prisma/db.ts';
import { requireAdmin } from '../auth/authorization.ts';

type AdminAuthorizer = () => Promise<unknown>;

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  categoryIsActive: boolean;
  priceMinor: number;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  isActive: boolean;
  isAvailable: boolean;
  updatedAt: string;
};

export type AdminCategoryOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type AdminProductDetails = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  priceMinor: number;
  sortOrder: number;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  isActive: boolean;
  isAvailable: boolean;
};

export async function getAdminProducts(
  authorize: AdminAuthorizer = requireAdmin,
): Promise<AdminProductRow[]> {
  await authorize();
  const rows = await db.orm.public.Product.include('category', (category) =>
    category.select('name', 'isActive'),
  )
    .orderBy((product) => product.updatedAt.desc())
    .orderBy((product) => product.id.asc())
    .all();
  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryName: product.category.name,
    categoryIsActive: product.category.isActive,
    priceMinor: product.priceMinor,
    imageUrl: product.imageUrl,
    imageWidth: product.imageWidth,
    imageHeight: product.imageHeight,
    isActive: product.isActive,
    isAvailable: product.isAvailable,
    updatedAt: new Date(product.updatedAt).toISOString(),
  }));
}

export async function getAdminCategoryOptions(
  authorize: AdminAuthorizer = requireAdmin,
): Promise<AdminCategoryOption[]> {
  await authorize();
  return db.orm.public.Category.select('id', 'name', 'isActive')
    .orderBy((category) => category.sortOrder.asc())
    .orderBy((category) => category.name.asc())
    .all();
}

export async function getAdminProduct(
  id: string,
  authorize: AdminAuthorizer = requireAdmin,
): Promise<AdminProductDetails | null> {
  await authorize();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    return null;
  const product = await db.orm.public.Product.select(
    'id',
    'name',
    'slug',
    'description',
    'categoryId',
    'priceMinor',
    'sortOrder',
    'imageUrl',
    'imageWidth',
    'imageHeight',
    'isActive',
    'isAvailable',
  )
    .where({ id })
    .first();
  return product ?? null;
}

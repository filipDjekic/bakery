import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '@/prisma/db';

import type { CatalogProduct } from './catalog';

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRODUCT_SLUG_MAX_LENGTH = 140;

export type PublicProductDetail = CatalogProduct & {
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

function isValidProductSlug(slug: string): slug is string & Varchar<140> {
  return (
    slug.length <= PRODUCT_SLUG_MAX_LENGTH && PRODUCT_SLUG_PATTERN.test(slug)
  );
}

export async function getPublicProductBySlug(
  slug: string,
): Promise<PublicProductDetail | null> {
  if (!isValidProductSlug(slug)) {
    return null;
  }

  const product = await db.orm.public.Product.include('category')
    .where({ slug, isActive: true })
    .first();

  if (!product || !product.category.isActive) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceMinor: product.priceMinor,
    imageUrl: product.imageUrl,
    imageWidth: product.imageWidth,
    imageHeight: product.imageHeight,
    isAvailable: product.isAvailable,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
  };
}

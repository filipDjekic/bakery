import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { cacheLife, cacheTag } from 'next/cache';

import { db } from '@/prisma/db';
import { productCacheTag, PUBLIC_CACHE_TAGS } from '@/server/cache/tags';

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

export function selectRelatedProducts(
  products: CatalogProduct[],
  currentProductId: string,
  limit = 4,
): CatalogProduct[] {
  return products
    .filter((product) => product.id !== currentProductId)
    .sort((left, right) => Number(right.isAvailable) - Number(left.isAvailable))
    .slice(0, limit);
}

function isValidProductSlug(slug: string): slug is string & Varchar<140> {
  return (
    slug.length <= PRODUCT_SLUG_MAX_LENGTH && PRODUCT_SLUG_PATTERN.test(slug)
  );
}

export async function getPublicProductBySlug(
  slug: string,
): Promise<PublicProductDetail | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(PUBLIC_CACHE_TAGS.catalog, PUBLIC_CACHE_TAGS.categories);

  if (!isValidProductSlug(slug)) {
    return null;
  }

  const product = await db.orm.public.Product.include('category')
    .where({ slug, isActive: true })
    .first();

  if (!product || !product.category.isActive) {
    return null;
  }

  cacheTag(productCacheTag(product.id));

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

export async function getRelatedPublicProducts(
  categoryId: string,
  currentProductId: string,
  limit = 4,
): Promise<CatalogProduct[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(PUBLIC_CACHE_TAGS.catalog, PUBLIC_CACHE_TAGS.categories);

  const category = await db.orm.public.Category.include(
    'products',
    (products) =>
      products
        .where({ isActive: true })
        .orderBy((product) => product.sortOrder.asc())
        .orderBy((product) => product.id.asc()),
  )
    .where({ id: categoryId, isActive: true })
    .first();

  if (!category) return [];
  const products = category.products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceMinor: product.priceMinor,
    imageUrl: product.imageUrl,
    imageWidth: product.imageWidth,
    imageHeight: product.imageHeight,
    isAvailable: product.isAvailable,
  }));
  return selectRelatedProducts(products, currentProductId, limit);
}

export async function getPublicProductSitemapEntries() {
  'use cache';
  cacheLife('hours');
  cacheTag(PUBLIC_CACHE_TAGS.catalog, PUBLIC_CACHE_TAGS.categories);

  const products = await db.orm.public.Product.include('category')
    .where({ isActive: true })
    .orderBy((product) => product.slug.asc())
    .all();
  return products
    .filter((product) => product.category.isActive)
    .map((product) => ({
      slug: product.slug,
      updatedAt: new Date(product.updatedAt),
    }));
}

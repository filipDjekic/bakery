import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { db } from '../../prisma/db.ts';
import { PUBLIC_CACHE_TAGS } from '../cache/tags.ts';

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMinor: number;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  isAvailable: boolean;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  products: CatalogProduct[];
};

export type CatalogCategoryFilterOption = Pick<
  CatalogCategory,
  'id' | 'name' | 'slug'
>;

export type PublicCatalog = {
  categories: CatalogCategory[];
  filterCategories: CatalogCategoryFilterOption[];
  selectedCategorySlug: string | null;
};

async function getCachedPublicCatalog(): Promise<CatalogCategory[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(PUBLIC_CACHE_TAGS.catalog, PUBLIC_CACHE_TAGS.categories);

  const categoryRows = await db.orm.public.Category.include(
    'products',
    (products) =>
      products
        .where({ isActive: true })
        .orderBy((product) => product.sortOrder.asc())
        .orderBy((product) => product.name.asc())
        .orderBy((product) => product.id.asc()),
  )
    .where({ isActive: true })
    .orderBy((category) => category.sortOrder.asc())
    .orderBy((category) => category.id.asc())
    .all();

  return categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    products: category.products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceMinor: product.priceMinor,
      imageUrl: product.imageUrl,
      imageWidth: product.imageWidth,
      imageHeight: product.imageHeight,
      isAvailable: product.isAvailable,
    })),
  }));
}

export async function getPublicCatalog(
  requestedCategorySlug?: string,
): Promise<PublicCatalog> {
  const allCategories = await getCachedPublicCatalog();
  const selectedCategory = requestedCategorySlug
    ? allCategories.find((category) => category.slug === requestedCategorySlug)
    : undefined;

  return {
    categories: selectedCategory ? [selectedCategory] : allCategories,
    filterCategories: allCategories.map(({ id, name, slug }) => ({
      id,
      name,
      slug,
    })),
    selectedCategorySlug: selectedCategory?.slug ?? null,
  };
}

import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../prisma/db.ts';
import {
  productMutationSchema,
  type ProductMutationInput,
} from '../../validation/product.ts';
import { requireAdmin } from '../auth/authorization.ts';
import type { StoredProductImage } from '../images/blob-storage.ts';
import {
  isProductSlugConflict,
  ProductDomainError,
} from './product-mutation.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength)
    throw new Error(`Value exceeds varchar(${maxLength}).`);
  return value as Varchar<N>;
}

type UpdateProductInput = ProductMutationInput & {
  id: string;
  changeSlug: boolean;
  image?: StoredProductImage;
};

export async function updateProduct(
  input: UpdateProductInput,
  authorize: () => Promise<unknown> = requireAdmin,
): Promise<{ id: string; slug: string; oldImagePathname: string | null }> {
  await authorize();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.id,
    )
  ) {
    throw new ProductDomainError('VALIDATION_ERROR', 'Proizvod nije validan.');
  }
  const current = await db.orm.public.Product.select(
    'id',
    'slug',
    'categoryId',
    'imageUrl',
    'imagePathname',
  )
    .where({ id: input.id })
    .first();
  if (!current)
    throw new ProductDomainError('NOT_FOUND', 'Proizvod ne postoji.');
  const parsed = productMutationSchema.safeParse({
    ...input,
    slug: input.changeSlug ? input.slug : current.slug,
  });
  if (!parsed.success)
    throw new ProductDomainError(
      'VALIDATION_ERROR',
      'Podaci proizvoda nisu validni.',
      parsed.error.issues,
    );
  if (parsed.data.isActive && !(input.image?.url ?? current.imageUrl))
    throw new ProductDomainError(
      'IMAGE_REQUIRED',
      'Aktivan proizvod mora imati sliku.',
    );
  const category = await db.orm.public.Category.select('id', 'isActive')
    .where({ id: parsed.data.categoryId })
    .first();
  if (!category)
    throw new ProductDomainError('NOT_FOUND', 'Kategorija ne postoji.');
  if (!category.isActive && parsed.data.categoryId !== current.categoryId)
    throw new ProductDomainError(
      'INACTIVE_CATEGORY',
      'Izabrana kategorija nije aktivna.',
    );
  if (input.changeSlug && parsed.data.slug !== current.slug) {
    const duplicate = await db.orm.public.Product.select('id')
      .where({ slug: varchar(parsed.data.slug, 140) })
      .first();
    if (duplicate && duplicate.id !== current.id)
      throw new ProductDomainError(
        'DUPLICATE_SLUG',
        'Slug već koristi drugi proizvod.',
      );
  }
  try {
    await db.orm.public.Product.where({ id: current.id }).update({
      categoryId: parsed.data.categoryId,
      name: varchar(parsed.data.name, 120),
      slug: varchar(parsed.data.slug, 140),
      description: varchar(parsed.data.description, 1000),
      priceMinor: parsed.data.priceMinor,
      ...(input.image
        ? {
            imageUrl: input.image.url,
            imagePathname: input.image.pathname,
            imageWidth: input.image.width,
            imageHeight: input.image.height,
          }
        : {}),
      isActive: parsed.data.isActive,
      isAvailable: parsed.data.isAvailable,
      sortOrder: parsed.data.sortOrder,
    });
  } catch (error) {
    if (isProductSlugConflict(error))
      throw new ProductDomainError(
        'DUPLICATE_SLUG',
        'Slug već koristi drugi proizvod.',
      );
    throw error;
  }
  return {
    id: current.id,
    slug: parsed.data.slug,
    oldImagePathname: current.imagePathname,
  };
}

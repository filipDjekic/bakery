import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../prisma/db.ts';
import {
  productMutationSchema,
  type ProductMutationInput,
} from '../../validation/product.ts';
import { requireAdmin } from '../auth/authorization.ts';
import type {
  BlobStorage,
  StoredProductImage,
} from '../images/blob-storage.ts';
import { vercelBlobStorage } from '../images/blob-storage.ts';
import {
  isProductSlugConflict,
  ProductDomainError,
} from './product-mutation.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength)
    throw new Error(`Value exceeds varchar(${maxLength}).`);
  return value as Varchar<N>;
}

type CreateProductInput = ProductMutationInput & {
  image: StoredProductImage | null;
};

export async function createProduct(
  input: CreateProductInput,
  dependencies: {
    authorize?: () => Promise<unknown>;
    storage?: BlobStorage;
  } = {},
): Promise<{ id: string; slug: string }> {
  await (dependencies.authorize ?? requireAdmin)();
  try {
    const parsed = productMutationSchema.safeParse(input);
    if (!parsed.success)
      throw new ProductDomainError(
        'VALIDATION_ERROR',
        'Podaci proizvoda nisu validni.',
        parsed.error.issues,
      );
    if (parsed.data.isActive && !input.image)
      throw new ProductDomainError(
        'IMAGE_REQUIRED',
        'Aktivan proizvod mora imati sliku.',
      );
    const category = await db.orm.public.Category.select('id', 'isActive')
      .where({ id: parsed.data.categoryId })
      .first();
    if (!category)
      throw new ProductDomainError('NOT_FOUND', 'Kategorija ne postoji.');
    if (!category.isActive)
      throw new ProductDomainError(
        'INACTIVE_CATEGORY',
        'Nova kategorija proizvoda mora biti aktivna.',
      );
    const duplicate = await db.orm.public.Product.select('id')
      .where({ slug: varchar(parsed.data.slug, 140) })
      .first();
    if (duplicate)
      throw new ProductDomainError(
        'DUPLICATE_SLUG',
        'Slug već koristi drugi proizvod.',
      );
    return await db.orm.public.Product.select('id', 'slug').create({
      categoryId: parsed.data.categoryId,
      name: varchar(parsed.data.name, 120),
      slug: varchar(parsed.data.slug, 140),
      description: varchar(parsed.data.description, 1000),
      priceMinor: parsed.data.priceMinor,
      imageUrl: input.image?.url ?? null,
      imagePathname: input.image?.pathname ?? null,
      imageWidth: input.image?.width ?? null,
      imageHeight: input.image?.height ?? null,
      isActive: parsed.data.isActive,
      isAvailable: parsed.data.isAvailable,
      sortOrder: parsed.data.sortOrder,
    });
  } catch (error) {
    if (input.image) {
      try {
        await (dependencies.storage ?? vercelBlobStorage).delete(
          input.image.pathname,
        );
      } catch (cleanupError) {
        console.error('Product image orphan candidate after create failure.', {
          pathname: input.image.pathname,
          cleanupError,
        });
      }
    }
    if (isProductSlugConflict(error))
      throw new ProductDomainError(
        'DUPLICATE_SLUG',
        'Slug već koristi drugi proizvod.',
      );
    throw error;
  }
}

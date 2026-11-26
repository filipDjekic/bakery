import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import {
  lockProductCategories,
  nextCatalogVersion,
  catalogVersionSchema,
} from './catalog-locks.ts';
import { z } from 'zod';
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
  changeSlug?: boolean;
  expectedUpdatedAt?: string;
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
  return db.transaction(async (tx) => {
    const initial = await tx.orm.public.Product.select('categoryId')
      .where({ id: input.id })
      .first();
    if (!initial)
      throw new ProductDomainError('NOT_FOUND', 'Proizvod ne postoji.');
    if (
      !z.string().uuid().safeParse(input.categoryId).success ||
      (input.expectedUpdatedAt !== undefined &&
        !catalogVersionSchema.safeParse(input.expectedUpdatedAt).success)
    )
      throw new ProductDomainError(
        'VALIDATION_ERROR',
        'Osvežite podatke proizvoda.',
      );
    await lockProductCategories(tx, [initial.categoryId, input.categoryId]);
    const current = await tx.orm.public.Product.select(
      'id',
      'slug',
      'categoryId',
      'imageUrl',
      'imagePathname',
      'updatedAt',
    )
      .where({ id: input.id })
      .first();
    if (!current)
      throw new ProductDomainError('NOT_FOUND', 'Proizvod ne postoji.');
    const expected = input.expectedUpdatedAt ?? current.updatedAt;
    if (Date.parse(expected) !== Date.parse(current.updatedAt))
      throw new ProductDomainError(
        'CONFLICT',
        'Proizvod je u međuvremenu izmenjen. Osvežite podatke.',
      );
    const parsed = productMutationSchema.safeParse({
      ...input,
      slug: current.slug,
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
    const category = await tx.orm.public.Category.select('id', 'isActive')
      .where({ id: parsed.data.categoryId })
      .first();
    if (!category)
      throw new ProductDomainError('NOT_FOUND', 'Kategorija ne postoji.');
    if (
      !category.isActive &&
      (parsed.data.isActive ||
        parsed.data.isAvailable ||
        parsed.data.categoryId !== current.categoryId)
    )
      throw new ProductDomainError(
        'INACTIVE_CATEGORY',
        'Izabrana kategorija nije aktivna.',
      );
    try {
      const updated = await tx.orm.public.Product.where({
        id: current.id,
        updatedAt: current.updatedAt,
      }).updateAll({
        updatedAt: nextCatalogVersion(current.updatedAt),
        categoryId: parsed.data.categoryId,
        name: varchar(parsed.data.name, 120),
        slug: current.slug,
        description: varchar(parsed.data.description, 1000),
        priceMinor: parsed.data.priceMinor,
        unitLabel: parsed.data.unitLabel
          ? varchar(parsed.data.unitLabel, 40)
          : null,
        allergenInfo: parsed.data.allergenInfo
          ? varchar(parsed.data.allergenInfo, 500)
          : null,
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
      if (updated.length !== 1)
        throw new ProductDomainError(
          'CONFLICT',
          'Proizvod je u međuvremenu izmenjen. Osvežite podatke.',
        );
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
      slug: current.slug,
      oldImagePathname: input.image ? current.imagePathname : null,
    };
  });
}

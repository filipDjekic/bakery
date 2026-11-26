import 'server-only';
import { db } from '../../prisma/db.ts';
import { requireAdmin } from '../auth/authorization.ts';
import { productToggleSchema } from '../../validation/product.ts';
import { ProductDomainError } from './product-mutation.ts';
import {
  lockProductCategories,
  nextCatalogVersion,
  catalogVersionSchema,
} from './catalog-locks.ts';

export async function toggleProduct(
  input: {
    id: string;
    value: boolean;
    field: 'isActive' | 'isAvailable';
    expectedUpdatedAt: string;
  },
  authorize: () => Promise<unknown> = requireAdmin,
) {
  await authorize();
  if (
    !productToggleSchema.safeParse(input).success ||
    !catalogVersionSchema.safeParse(input.expectedUpdatedAt).success ||
    !['isActive', 'isAvailable'].includes(input.field)
  )
    throw new ProductDomainError(
      'VALIDATION_ERROR',
      'Promena proizvoda nije validna. Osvežite podatke.',
    );
  return db.transaction(async (tx) => {
    const product = await tx.orm.public.Product.where({ id: input.id }).first();
    if (!product)
      throw new ProductDomainError('NOT_FOUND', 'Proizvod ne postoji.');
    await lockProductCategories(tx, [product.categoryId]);
    const category = await tx.orm.public.Category.where({
      id: product.categoryId,
    }).first();
    if (input.value && !category?.isActive)
      throw new ProductDomainError(
        'INACTIVE_CATEGORY',
        'Proizvod je skriven jer kategorija nije aktivna.',
      );
    if (input.field === 'isActive' && input.value && !product.imageUrl)
      throw new ProductDomainError(
        'IMAGE_REQUIRED',
        'Proizvod bez slike ne može biti aktiviran.',
      );
    if (Date.parse(input.expectedUpdatedAt) !== Date.parse(product.updatedAt))
      throw new ProductDomainError(
        'CONFLICT',
        'Proizvod je u međuvremenu izmenjen. Osvežite podatke.',
      );
    const updatedAt = nextCatalogVersion(product.updatedAt);
    const changed = await tx.orm.public.Product.where({
      id: input.id,
      updatedAt: product.updatedAt,
    }).updateAll({ [input.field]: input.value, updatedAt });
    if (changed.length !== 1)
      throw new ProductDomainError(
        'CONFLICT',
        'Proizvod je u međuvremenu izmenjen. Osvežite podatke.',
      );
    return { updatedAt };
  });
}

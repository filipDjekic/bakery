'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { db } from '../../../prisma/db.ts';
import { requireAdmin } from '../../../server/auth/authorization.ts';
import {
  productCacheTag,
  PUBLIC_CACHE_TAGS,
} from '../../../server/cache/tags.ts';
import { ProductDomainError } from '../../../server/services/product-mutation.ts';
import { productToggleSchema } from '../../../validation/product.ts';

export async function setProductActive(
  id: string,
  value: boolean,
): Promise<void> {
  await requireAdmin();
  const parsed = productToggleSchema.safeParse({ id, value });
  if (!parsed.success)
    throw new ProductDomainError(
      'VALIDATION_ERROR',
      'Promena statusa nije validna.',
      parsed.error.issues,
    );
  const product = await db.orm.public.Product.select('id', 'imageUrl')
    .where({ id: parsed.data.id })
    .first();
  if (!product)
    throw new ProductDomainError('NOT_FOUND', 'Proizvod ne postoji.');
  if (parsed.data.value && !product.imageUrl)
    throw new ProductDomainError(
      'IMAGE_REQUIRED',
      'Proizvod bez slike ne može biti aktiviran.',
    );
  await db.orm.public.Product.where({ id: parsed.data.id }).update({
    isActive: parsed.data.value,
  });
  updateTag(PUBLIC_CACHE_TAGS.catalog);
  updateTag(productCacheTag(parsed.data.id));
  revalidatePath('/');
  revalidatePath('/proizvodi');
  revalidatePath('/admin/products');
}

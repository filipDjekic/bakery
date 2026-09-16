'use server';

import { revalidatePath } from 'next/cache';

import { db } from '../../../prisma/db.ts';
import { requireAdmin } from '../../../server/auth/authorization.ts';
import { ProductDomainError } from '../../../server/services/product-mutation.ts';
import { productToggleSchema } from '../../../validation/product.ts';

export async function setProductAvailable(
  id: string,
  value: boolean,
): Promise<void> {
  await requireAdmin();
  const parsed = productToggleSchema.safeParse({ id, value });
  if (!parsed.success)
    throw new ProductDomainError(
      'VALIDATION_ERROR',
      'Promena dostupnosti nije validna.',
      parsed.error.issues,
    );
  const product = await db.orm.public.Product.select('id')
    .where({ id: parsed.data.id })
    .first();
  if (!product)
    throw new ProductDomainError('NOT_FOUND', 'Proizvod ne postoji.');
  await db.orm.public.Product.where({ id: parsed.data.id }).update({
    isAvailable: parsed.data.value,
  });
  revalidatePath('/');
  revalidatePath('/proizvodi');
  revalidatePath('/admin/products');
}

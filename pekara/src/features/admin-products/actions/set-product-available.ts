'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { toggleProduct } from '../../../server/services/toggle-product.ts';
import { requireAdmin } from '../../../server/auth/authorization.ts';
import {
  productCacheTag,
  PUBLIC_CACHE_TAGS,
} from '../../../server/cache/tags.ts';

export async function setProductAvailable(
  id: string,
  value: boolean,
  expectedUpdatedAt: string,
): Promise<{ updatedAt: string }> {
  await requireAdmin();
  const result = await toggleProduct(
    { id, value, expectedUpdatedAt, field: 'isAvailable' },
    async () => undefined,
  );
  updateTag(PUBLIC_CACHE_TAGS.catalog);
  updateTag(productCacheTag(id));
  revalidatePath('/');
  revalidatePath('/proizvodi');
  revalidatePath('/admin/products');
  return result;
}

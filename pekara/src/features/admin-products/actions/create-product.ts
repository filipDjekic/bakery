'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { setSuccessFlash } from '../../../server/http/flash-toast.ts';
import { productMutationSchema } from '../../../validation/product.ts';
import { ProductDomainError } from '../../../server/services/product-mutation.ts';

import { requireAdmin } from '../../../server/auth/authorization.ts';
import { PUBLIC_CACHE_TAGS } from '../../../server/cache/tags.ts';
import { vercelBlobStorage } from '../../../server/images/blob-storage.ts';
import { createProduct } from '../../../server/services/create-product.ts';
import { productActionError } from './product-action-error.ts';
import type { ProductActionState } from './product-action-state.ts';
import {
  optionalImageFromFormData,
  productValuesFromFormData,
} from './product-form-values.ts';
import { uploadProductImage } from './upload-product-image.ts';

export async function createProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  let image = null;
  try {
    await requireAdmin();
    const values = productValuesFromFormData(formData);
    const validation = productMutationSchema.safeParse(values);
    if (!validation.success)
      throw new ProductDomainError(
        'VALIDATION_ERROR',
        'Proverite podatke proizvoda.',
        validation.error.issues,
      );
    const file = optionalImageFromFormData(formData);
    image = file ? await uploadProductImage(file) : null;
    await createProduct(
      { ...values, image },
      { authorize: async () => undefined, storage: vercelBlobStorage },
    );
    updateTag(PUBLIC_CACHE_TAGS.catalog);
    revalidatePath('/');
    revalidatePath('/proizvodi');
    revalidatePath('/admin/products');
    await setSuccessFlash('Proizvod je uspešno kreiran.');
  } catch (error) {
    return productActionError(error);
  }
  redirect('/admin/products');
}

'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '../../../server/auth/authorization.ts';
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
    const file = optionalImageFromFormData(formData);
    image = file ? await uploadProductImage(file) : null;
    const product = await createProduct(
      { ...productValuesFromFormData(formData), image },
      { authorize: async () => undefined, storage: vercelBlobStorage },
    );
    revalidatePath('/');
    revalidatePath('/proizvodi');
    revalidatePath('/admin/products');
    return { status: 'success', message: `/admin/products/${product.id}` };
  } catch (error) {
    return productActionError(error);
  }
}

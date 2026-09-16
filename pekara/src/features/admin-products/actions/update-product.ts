'use server';

import { revalidatePath } from 'next/cache';

import { vercelBlobStorage } from '../../../server/images/blob-storage.ts';
import { replaceProductImage } from '../../../server/services/replace-product-image.ts';
import { updateProduct } from '../../../server/services/update-product.ts';
import { productActionError } from './product-action-error.ts';
import type { ProductActionState } from './product-action-state.ts';
import {
  optionalImageFromFormData,
  productValuesFromFormData,
} from './product-form-values.ts';
import { uploadProductImage } from './upload-product-image.ts';

export async function updateProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = String(formData.get('id') ?? '');
  const values = productValuesFromFormData(formData);
  const changeSlug = formData.get('changeSlug') === 'on';
  try {
    const file = optionalImageFromFormData(formData);
    const result = file
      ? await replaceProductImage({
          upload: () => uploadProductImage(file),
          updateDatabase: async (image) => {
            const updated = await updateProduct({
              ...values,
              id,
              changeSlug,
              image,
            });
            return { value: updated, oldPathname: updated.oldImagePathname };
          },
          storage: vercelBlobStorage,
        })
      : await updateProduct({ ...values, id, changeSlug });
    revalidatePath('/');
    revalidatePath('/proizvodi');
    revalidatePath(`/proizvodi/${result.slug}`);
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${id}`);
    return { status: 'success', message: 'Proizvod je sačuvan.' };
  } catch (error) {
    return productActionError(error);
  }
}

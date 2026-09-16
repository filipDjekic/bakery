'use server';

import type { StoredProductImage } from '../../../server/images/blob-storage.ts';
import { storeProductImage } from '../../../server/images/upload-product-image.ts';

export async function uploadProductImage(
  file: File,
): Promise<StoredProductImage> {
  return storeProductImage(file);
}

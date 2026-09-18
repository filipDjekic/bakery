'use server';

import type { StoredProductImage } from '../../../server/images/blob-storage.ts';
import { storeProductImage } from '../../../server/images/upload-product-image.ts';
import { requireAdmin } from '../../../server/auth/authorization.ts';

export async function uploadProductImage(
  file: File,
): Promise<StoredProductImage> {
  await requireAdmin();
  return storeProductImage(file, { authorize: async () => undefined });
}

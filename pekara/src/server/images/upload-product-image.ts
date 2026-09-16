import 'server-only';

import { requireAdmin } from '../auth/authorization.ts';
import {
  vercelBlobStorage,
  type BlobStorage,
  type StoredProductImage,
} from './blob-storage.ts';
import { validateProductImage } from './validate-product-image.ts';

type AdminAuthorizer = () => Promise<unknown>;

export async function storeProductImage(
  file: File,
  dependencies: { authorize?: AdminAuthorizer; storage?: BlobStorage } = {},
): Promise<StoredProductImage> {
  await (dependencies.authorize ?? requireAdmin)();
  const image = await validateProductImage(file);
  const pathname = `products/${crypto.randomUUID()}.${image.extension}`;
  const stored = await (dependencies.storage ?? vercelBlobStorage).upload(
    pathname,
    image.bytes,
    image.mimeType,
  );
  return { ...stored, width: image.width, height: image.height };
}

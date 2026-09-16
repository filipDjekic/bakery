import 'server-only';

import type {
  BlobStorage,
  StoredProductImage,
} from '../images/blob-storage.ts';
import { vercelBlobStorage } from '../images/blob-storage.ts';

export async function replaceProductImage<T>(options: {
  upload: () => Promise<StoredProductImage>;
  updateDatabase: (
    image: StoredProductImage,
  ) => Promise<{ value: T; oldPathname: string | null }>;
  storage?: BlobStorage;
}): Promise<T> {
  const storage = options.storage ?? vercelBlobStorage;
  const image = await options.upload();
  let result: { value: T; oldPathname: string | null };
  try {
    result = await options.updateDatabase(image);
  } catch (error) {
    try {
      await storage.delete(image.pathname);
    } catch (cleanupError) {
      console.error('Product image orphan candidate after database failure.', {
        pathname: image.pathname,
        cleanupError,
      });
    }
    throw error;
  }
  if (result.oldPathname && result.oldPathname !== image.pathname) {
    try {
      await storage.delete(result.oldPathname);
    } catch (cleanupError) {
      console.error('Old product image orphan candidate after replacement.', {
        pathname: result.oldPathname,
        cleanupError,
      });
    }
  }
  return result.value;
}

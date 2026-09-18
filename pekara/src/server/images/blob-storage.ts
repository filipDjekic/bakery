import 'server-only';

import { del, put } from '@vercel/blob';

export type StoredProductImage = {
  url: string;
  pathname: string;
  width: number;
  height: number;
};

export type BlobStorage = {
  upload(
    pathname: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<{ url: string; pathname: string }>;
  delete(pathname: string): Promise<void>;
};

type BlobClient = {
  put: typeof put;
  del: typeof del;
};

function productionBlobToken(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const token = environment.BLOB_READ_WRITE_TOKEN;
  if (!token || token !== token.trim()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured correctly.');
  }
  return token;
}

export function createVercelBlobStorage(
  client: BlobClient = { put, del },
  tokenProvider: () => string = productionBlobToken,
): BlobStorage {
  return {
    async upload(pathname, bytes, contentType) {
      const blob = await client.put(pathname, Buffer.from(bytes), {
        access: 'public',
        addRandomSuffix: false,
        contentType,
        token: tokenProvider(),
      });
      return { url: blob.url, pathname: blob.pathname };
    },
    async delete(pathname) {
      await client.del(pathname, { token: tokenProvider() });
    },
  };
}

export const vercelBlobStorage = createVercelBlobStorage();

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

export const vercelBlobStorage: BlobStorage = {
  async upload(pathname, bytes, contentType) {
    const blob = await put(pathname, Buffer.from(bytes), {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    });
    return { url: blob.url, pathname: blob.pathname };
  },
  async delete(pathname) {
    await del(pathname);
  },
};

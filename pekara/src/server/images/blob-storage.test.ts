import { describe, expect, it, vi } from 'vitest';

import { createVercelBlobStorage } from './blob-storage';

describe('Vercel Blob storage', () => {
  it('uses the server-only token for upload and delete', async () => {
    const put = vi.fn().mockResolvedValue({
      url: 'https://store.public.blob.vercel-storage.com/products/test.webp',
      pathname: 'products/test.webp',
    });
    const del = vi.fn().mockResolvedValue(undefined);
    const storage = createVercelBlobStorage(
      { put, del } as never,
      () => 'server-only-blob-token',
    );

    await storage.upload(
      'products/test.webp',
      new Uint8Array([1, 2, 3]),
      'image/webp',
    );
    await storage.delete('products/test.webp');

    expect(put).toHaveBeenCalledWith(
      'products/test.webp',
      expect.any(Buffer),
      expect.objectContaining({ token: 'server-only-blob-token' }),
    );
    expect(del).toHaveBeenCalledWith('products/test.webp', {
      token: 'server-only-blob-token',
    });
  });

  it('does not call the provider when the token is invalid', async () => {
    const put = vi.fn();
    const storage = createVercelBlobStorage(
      { put, del: vi.fn() } as never,
      () => {
        throw new Error('invalid token');
      },
    );

    await expect(
      storage.upload('products/test.webp', new Uint8Array(), 'image/webp'),
    ).rejects.toThrow('invalid token');
    expect(put).not.toHaveBeenCalled();
  });
});

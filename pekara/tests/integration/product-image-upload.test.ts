import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BlobStorage } from '../../src/server/images/blob-storage.ts';
import { storeProductImage } from '../../src/server/images/upload-product-image.ts';
import { ProductImageValidationError } from '../../src/server/images/validate-product-image.ts';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function file(bytes: Uint8Array, type = 'image/png', name = '../../evil.svg') {
  return new File([Buffer.from(bytes)], name, { type });
}

test('uploads a valid image under a server-generated product pathname', async () => {
  let receivedPath = '';
  const storage: BlobStorage = {
    async upload(pathname, bytes, contentType) {
      receivedPath = pathname;
      assert.equal(contentType, 'image/png');
      assert.deepEqual(Buffer.from(bytes), png);
      return { pathname, url: `https://blob.example/${pathname}` };
    },
    async delete() {},
  };
  const result = await storeProductImage(file(png), {
    authorize: async () => ({ role: 'ADMIN' }),
    storage,
  });
  assert.match(receivedPath, /^products\/[0-9a-f-]+\.png$/);
  assert.equal(receivedPath.includes('evil'), false);
  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
});

test('rejects MIME spoofing, corrupt files and oversized images before storage', async () => {
  let calls = 0;
  const storage: BlobStorage = {
    async upload() {
      calls += 1;
      throw new Error('must not upload');
    },
    async delete() {},
  };
  const authorize = async () => ({ role: 'ADMIN' });
  await assert.rejects(
    () => storeProductImage(file(png, 'image/jpeg'), { authorize, storage }),
    ProductImageValidationError,
  );
  await assert.rejects(
    () =>
      storeProductImage(
        file(Uint8Array.of(0xff, 0xd8, 0xff, 0xd9), 'image/jpeg'),
        { authorize, storage },
      ),
    ProductImageValidationError,
  );
  await assert.rejects(
    () =>
      storeProductImage(file(new Uint8Array(3 * 1024 * 1024 + 1)), {
        authorize,
        storage,
      }),
    ProductImageValidationError,
  );
  assert.equal(calls, 0);
});

test('authorizes before reading or uploading and propagates storage failure', async () => {
  let uploads = 0;
  const storage: BlobStorage = {
    async upload() {
      uploads += 1;
      throw new Error('storage unavailable');
    },
    async delete() {},
  };
  await assert.rejects(
    () =>
      storeProductImage(file(png), {
        authorize: async () => {
          throw new Error('anonymous');
        },
        storage,
      }),
    /anonymous/,
  );
  assert.equal(uploads, 0);
  await assert.rejects(
    () =>
      storeProductImage(file(png), {
        authorize: async () => ({ role: 'ADMIN' }),
        storage,
      }),
    /storage unavailable/,
  );
  assert.equal(uploads, 1);
});

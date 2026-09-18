# Production image storage

## Configuration

1. Create or connect a Vercel Blob store owned by the production team/project.
2. Scope its `BLOB_READ_WRITE_TOKEN` to Production. Use a separate Preview
   store/token.
3. Confirm the token never has a `NEXT_PUBLIC_` prefix.
4. Product objects must use the `products/` prefix. `next/image` accepts only
   HTTPS URLs matching `*.public.blob.vercel-storage.com/products/**`.

The storage adapter passes the server token explicitly for upload and delete and
rejects missing or whitespace-padded values.

## Smoke test

1. Sign in as admin and create an inactive product with a small valid image.
2. Activate it and confirm the optimized image renders on catalog and details.
3. Replace the image and verify the new object renders after cache invalidation.
4. Confirm the old object was deleted in Blob storage.
5. Delete/clean up the test product according to the data policy.
6. Review browser Network: image delivery must go through `next/image` and no
   Blob token may appear in HTML, JavaScript, URLs, or requests.

Record deployment URL, product ID, object path, operator, and timestamp without
recording the token.

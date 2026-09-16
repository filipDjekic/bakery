import 'server-only';

import { PRODUCT_IMAGE_LIMITS } from '../../config/limits.ts';

type SupportedMime = (typeof PRODUCT_IMAGE_LIMITS.allowedMimeTypes)[number];

export type ValidatedProductImage = {
  bytes: Uint8Array;
  mimeType: SupportedMime;
  extension: 'jpg' | 'png' | 'webp';
  width: number;
  height: number;
};

export class ProductImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductImageValidationError';
  }
}

function u16be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function u24le(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16)
  );
}

function u32be(bytes: Uint8Array, offset: number): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(offset);
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff)
      throw new ProductImageValidationError('JPEG je oštećen.');
    const marker = bytes[offset + 1]!;
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = u16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: u16be(bytes, offset + 3),
        width: u16be(bytes, offset + 5),
      };
    }
    offset += length;
  }
  throw new ProductImageValidationError('JPEG je oštećen ili nema dimenzije.');
}

function inspect(bytes: Uint8Array): Omit<ValidatedProductImage, 'bytes'> {
  if (
    bytes.length >= 45 &&
    bytes
      .slice(0, 8)
      .every(
        (value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index],
      )
  ) {
    if (
      u32be(bytes, 8) !== 13 ||
      String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR' ||
      String.fromCharCode(...bytes.slice(-8, -4)) !== 'IEND'
    )
      throw new ProductImageValidationError('PNG je oštećen.');
    return {
      mimeType: 'image/png',
      extension: 'png',
      width: u32be(bytes, 16),
      height: u32be(bytes, 20),
    };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  ) {
    return {
      mimeType: 'image/jpeg',
      extension: 'jpg',
      ...jpegDimensions(bytes),
    };
  }
  if (
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    const declaredSize =
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
        4,
        true,
      ) + 8;
    if (declaredSize !== bytes.length)
      throw new ProductImageValidationError('WebP je oštećen.');
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    if (kind === 'VP8X')
      return {
        mimeType: 'image/webp',
        extension: 'webp',
        width: 1 + u24le(bytes, 24),
        height: 1 + u24le(bytes, 27),
      };
    if (kind === 'VP8L' && bytes[20] === 0x2f) {
      const bits =
        bytes[21]! |
        (bytes[22]! << 8) |
        (bytes[23]! << 16) |
        (bytes[24]! << 24);
      return {
        mimeType: 'image/webp',
        extension: 'webp',
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (
      kind === 'VP8 ' &&
      bytes.length >= 30 &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      return {
        mimeType: 'image/webp',
        extension: 'webp',
        width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
        height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
      };
    }
  }
  throw new ProductImageValidationError(
    'Dozvoljeni su samo validni JPEG, PNG ili WebP fajlovi.',
  );
}

export async function validateProductImage(
  file: File,
): Promise<ValidatedProductImage> {
  if (file.size === 0)
    throw new ProductImageValidationError('Slika je prazna.');
  if (file.size > PRODUCT_IMAGE_LIMITS.maximumBytes)
    throw new ProductImageValidationError('Slika može imati najviše 3 MB.');
  if (
    !PRODUCT_IMAGE_LIMITS.allowedMimeTypes.includes(file.type as SupportedMime)
  )
    throw new ProductImageValidationError('Format slike nije dozvoljen.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const metadata = inspect(bytes);
  if (metadata.mimeType !== file.type)
    throw new ProductImageValidationError(
      'Sadržaj slike ne odgovara prijavljenom formatu.',
    );
  if (
    metadata.width < 1 ||
    metadata.height < 1 ||
    metadata.width > PRODUCT_IMAGE_LIMITS.maximumDimension ||
    metadata.height > PRODUCT_IMAGE_LIMITS.maximumDimension
  )
    throw new ProductImageValidationError('Dimenzije slike nisu validne.');
  return { bytes, ...metadata };
}

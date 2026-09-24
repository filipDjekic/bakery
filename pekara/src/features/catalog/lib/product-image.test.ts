import { describe, expect, it } from 'vitest';

import { productImageAspectRatio } from './product-image';

describe('product image dimensions', () => {
  it('uses known dimensions and safely falls back for missing metadata', () => {
    expect(productImageAspectRatio(1200, 800)).toBe('1200 / 800');
    expect(productImageAspectRatio(null, null)).toBeUndefined();
    expect(productImageAspectRatio(0, 800)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';

import type { CatalogProduct } from './catalog';
import { selectRelatedProducts } from './product';

const product = (id: string, isAvailable = true): CatalogProduct => ({
  id,
  name: id,
  slug: id,
  description: id,
  priceMinor: 100,
  imageUrl: null,
  imageWidth: null,
  imageHeight: null,
  isAvailable,
});

describe('related products', () => {
  it('excludes the current product, prioritizes availability and limits results', () => {
    const result = selectRelatedProducts(
      [product('current'), product('sold-out', false), product('available')],
      'current',
      2,
    );
    expect(result.map(({ id }) => id)).toEqual(['available', 'sold-out']);
    expect(result).toHaveLength(2);
  });
});

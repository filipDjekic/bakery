import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CartCount } from '@/features/cart/components/cart-count';
import { ProductCard } from '@/features/catalog/components/product-card';

import { HomeCategories } from './home-categories';

describe('homepage components', () => {
  it('links every category to its slug filter', () => {
    const html = renderToStaticMarkup(
      <HomeCategories
        categories={[
          {
            id: 'category-1',
            name: 'Hlebovi',
            slug: 'hlebovi-i-peciva',
            description: null,
            imageUrl: null,
          },
        ]}
      />,
    );

    expect(html).toContain('/proizvodi?category=hlebovi-i-peciva');
  });

  it('renders an unavailable featured product without an add action', () => {
    const html = renderToStaticMarkup(
      <ProductCard
        product={{
          id: 'product-1',
          name: 'Kroasan',
          slug: 'kroasan',
          description: 'Puterasiti kroasan.',
          priceMinor: 25000,
          imageUrl: null,
          imageWidth: null,
          imageHeight: null,
          isAvailable: false,
        }}
      />,
    );

    expect(html).toContain('Rasprodato');
    expect(html).not.toContain('Dodaj Kroasan u korpu');
  });

  it('keeps the cart count accessible before hydration', () => {
    const html = renderToStaticMarkup(<CartCount />);
    expect(html).toContain('aria-label="Korpa, trenutno 0 artikala"');
  });
});

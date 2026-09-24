import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CartCount } from '@/features/cart/components/cart-count';
import { ProductCard } from '@/features/catalog/components/product-card';

import { HomeCategories } from './home-categories';
import { HomeHero } from './home-hero';

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

  it('renders explicit closing and next-opening status text', () => {
    const base = {
      todayHoursLabel: '06:00–20:00',
      nextPickupAt: null,
      nextPickupLabel: null,
    };
    const openHtml = renderToStaticMarkup(
      <HomeHero
        bakeryName="Mrvica"
        address="Glavna 1"
        operational={{
          ...base,
          isOpen: true,
          closesAt: '2026-09-21T18:00:00.000Z',
          closesAtLabel: '20:00',
          opensAtNext: null,
          opensAtNextLabel: null,
        }}
      />,
    );
    const closedHtml = renderToStaticMarkup(
      <HomeHero
        bakeryName="Mrvica"
        address="Glavna 1"
        operational={{
          ...base,
          isOpen: false,
          closesAt: null,
          closesAtLabel: null,
          opensAtNext: '2026-09-22T04:00:00.000Z',
          opensAtNextLabel: 'sutra u 06:00',
        }}
      />,
    );
    expect(openHtml).toContain('Otvoreno · do 20:00');
    expect(closedHtml).toContain('Zatvoreno · otvara se sutra u 06:00');
  });
});

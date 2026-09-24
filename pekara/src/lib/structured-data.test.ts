import { describe, expect, it } from 'vitest';

import type { CatalogProduct } from '@/server/queries/catalog';

import {
  buildBakeryStructuredData,
  buildProductStructuredData,
  serializeJsonLd,
} from './structured-data';

const product = (
  isAvailable: boolean,
  imageUrl: string | null,
): CatalogProduct => ({
  id: 'product-1',
  name: 'Kroasan',
  slug: 'kroasan',
  description: 'Puterasiti kroasan.',
  priceMinor: 20000,
  imageUrl,
  imageWidth: null,
  imageHeight: null,
  isAvailable,
});

describe('Bakery structured data', () => {
  it('uses real contact data and preserves split business-hour intervals', () => {
    const data = buildBakeryStructuredData({
      name: 'Test pekara',
      url: 'https://example.com/',
      telephone: '+381111',
      address: 'Glavna 1',
      businessHours: [
        { weekday: 1, openMinute: 360, closeMinute: 720 },
        { weekday: 1, openMinute: 840, closeMinute: 1200 },
      ],
    });
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('Bakery');
    expect(data.name).toBe('Test pekara');
    expect(data.telephone).toBe('+381111');
    expect(data.address).toBe('Glavna 1');
    expect(data.openingHoursSpecification).toEqual([
      expect.objectContaining({
        dayOfWeek: 'https://schema.org/Monday',
        opens: '06:00',
        closes: '12:00',
      }),
      expect.objectContaining({
        dayOfWeek: 'https://schema.org/Monday',
        opens: '14:00',
        closes: '20:00',
      }),
    ]);
  });

  it('omits missing optional fields and safely serializes controlled text', () => {
    const data = buildBakeryStructuredData({
      name: '</script>',
      url: 'https://example.com/',
      businessHours: [],
    });
    expect(data).not.toHaveProperty('telephone');
    expect(data).not.toHaveProperty('address');
    expect(data.openingHoursSpecification).toEqual([]);
    expect(serializeJsonLd(data)).not.toContain('</script>');
    expect(serializeJsonLd(data)).toContain('\\u003c/script>');
  });
});

describe('Product structured data', () => {
  it('builds an in-stock RSD offer with canonical URL and image', () => {
    const data = buildProductStructuredData({
      product: product(true, 'https://img.example/k.jpg'),
      url: 'https://example.com/proizvodi/kroasan',
      currencyCode: 'RSD',
    });
    expect(data['@type']).toBe('Product');
    expect(data.url).toBe('https://example.com/proizvodi/kroasan');
    expect(data.image).toBe('https://img.example/k.jpg');
    expect(data.offers).toEqual(
      expect.objectContaining({
        price: '200.00',
        priceCurrency: 'RSD',
        availability: 'https://schema.org/InStock',
      }),
    );
  });

  it('uses OutOfStock and remains valid without an image', () => {
    const data = buildProductStructuredData({
      product: product(false, null),
      url: 'https://example.com/proizvodi/kroasan',
      currencyCode: 'RSD',
    });
    expect(data).not.toHaveProperty('image');
    expect(data.offers.availability).toBe('https://schema.org/OutOfStock');
  });
});

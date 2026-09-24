import type { CatalogProduct } from '@/server/queries/catalog';

import type { WeeklyBusinessInterval } from './business-state';

const schemaDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function minuteTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function buildOpeningHoursStructuredData(
  businessHours: WeeklyBusinessInterval[],
) {
  return businessHours.map((hours) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${schemaDays[hours.weekday - 1]}`,
    opens: minuteTime(hours.openMinute),
    closes: minuteTime(hours.closeMinute),
  }));
}

export function buildBakeryStructuredData(input: {
  name: string;
  url: string;
  description?: string;
  telephone?: string;
  address?: string;
  image?: string | null;
  businessHours: WeeklyBusinessInterval[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.address ? { address: input.address } : {}),
    ...(input.image ? { image: input.image } : {}),
    openingHoursSpecification: buildOpeningHoursStructuredData(
      input.businessHours,
    ),
  };
}

export function buildProductStructuredData(input: {
  product: CatalogProduct;
  url: string;
  currencyCode: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.product.name,
    description: input.product.description,
    url: input.url,
    ...(input.product.imageUrl ? { image: input.product.imageUrl } : {}),
    offers: {
      '@type': 'Offer',
      url: input.url,
      price: (input.product.priceMinor / 100).toFixed(2),
      priceCurrency: input.currencyCode,
      availability: input.product.isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

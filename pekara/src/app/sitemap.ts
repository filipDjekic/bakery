import type { MetadataRoute } from 'next';

import { getPublicProductSitemapEntries } from '@/server/queries/product';

type SitemapProduct = { slug: string; updatedAt: Date };

export function buildSitemap(
  baseUrl: URL,
  products: SitemapProduct[],
): MetadataRoute.Sitemap {
  return [
    { url: new URL('/', baseUrl).href, changeFrequency: 'daily', priority: 1 },
    {
      url: new URL('/proizvodi', baseUrl).href,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...products.map((product) => ({
      url: new URL(`/proizvodi/${encodeURIComponent(product.slug)}`, baseUrl)
        .href,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = new URL(process.env.APP_URL ?? 'http://localhost:3000');
  const products = await getPublicProductSitemapEntries();
  return buildSitemap(baseUrl, products);
}

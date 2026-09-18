import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = new URL(process.env.APP_URL ?? 'http://localhost:3000');
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/checkout', '/korpa', '/porudzbina/'] },
    sitemap: new URL('/sitemap.xml', baseUrl).href,
  };
}

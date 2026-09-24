import type { Metadata } from 'next';

import { Container } from '@/components/layout/container';
import { HomeBenefits } from '@/features/home/components/home-benefits';
import { HomeCategories } from '@/features/home/components/home-categories';
import { HomeCtaBanner } from '@/features/home/components/home-cta-banner';
import { HomeFeaturedProducts } from '@/features/home/components/home-featured-products';
import { HomeHero } from '@/features/home/components/home-hero';
import { HomeHowItWorks } from '@/features/home/components/home-how-it-works';
import { HomeInfoBar } from '@/features/home/components/home-info-bar';
import { siteDescription } from '@/lib/site-metadata';
import {
  buildBakeryStructuredData,
  serializeJsonLd,
} from '@/lib/structured-data';
import {
  getCachedHomepageContent,
  getCurrentHomepageOperationalState,
} from '@/server/queries/home';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getCachedHomepageContent();
  const description = siteDescription(settings);
  return {
    title: settings.bakeryName,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      title: settings.bakeryName,
      description,
      siteName: settings.bakeryName,
      locale: 'sr_RS',
    },
  };
}

export default async function HomePage() {
  const { settings, categories, featuredProducts } =
    await getCachedHomepageContent();
  const { operational } = await getCurrentHomepageOperationalState(settings);
  const heroProduct = featuredProducts.find((product) => product.imageUrl);
  const baseUrl = new URL(process.env.APP_URL ?? 'http://localhost:3000');
  const structuredData = buildBakeryStructuredData({
    name: settings.bakeryName,
    url: baseUrl.href,
    description: siteDescription(settings),
    telephone: settings.phone,
    address: settings.address,
    image: heroProduct?.imageUrl
      ? new URL(heroProduct.imageUrl, baseUrl).href
      : null,
    businessHours: settings.businessHours,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <Container>
        <HomeHero
          bakeryName={settings.bakeryName}
          address={settings.address}
          operational={operational}
          heroProduct={heroProduct}
        />
        <HomeInfoBar
          address={settings.address}
          phone={settings.phone}
          todayHoursLabel={operational.todayHoursLabel}
        />
        <HomeFeaturedProducts products={featuredProducts} />
      </Container>
      <div className="bg-surface-muted border-border border-y">
        <Container>
          <HomeCategories categories={categories} />
        </Container>
      </div>
      <Container>
        <HomeHowItWorks />
      </Container>
      <div className="bg-surface-muted border-border border-y">
        <Container>
          <HomeBenefits bakeryName={settings.bakeryName} />
        </Container>
      </div>
      <Container className="pt-16 lg:pt-24">
        <HomeCtaBanner product={heroProduct} />
      </Container>
    </>
  );
}

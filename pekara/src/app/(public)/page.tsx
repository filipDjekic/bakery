import type { Metadata } from 'next';

import { Container } from '@/components/layout/container';
import { HomeBenefits } from '@/features/home/components/home-benefits';
import { HomeCategories } from '@/features/home/components/home-categories';
import { HomeCtaBanner } from '@/features/home/components/home-cta-banner';
import { HomeFeaturedProducts } from '@/features/home/components/home-featured-products';
import { HomeHero } from '@/features/home/components/home-hero';
import { HomeHowItWorks } from '@/features/home/components/home-how-it-works';
import { HomeInfoBar } from '@/features/home/components/home-info-bar';
import { getHomepageData } from '@/server/queries/home';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getHomepageData();
  const description = `Sveži pekarski proizvodi pekare ${settings.bakeryName}. Poručite online za preuzimanje na adresi ${settings.address}.`;
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
  const { settings, categories, featuredProducts, operational } =
    await getHomepageData();
  const heroProduct = featuredProducts.find((product) => product.imageUrl);

  return (
    <>
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

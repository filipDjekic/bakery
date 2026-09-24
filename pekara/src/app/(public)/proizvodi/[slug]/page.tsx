import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { ProductImagePlaceholder } from '@/features/catalog/components/product-image-placeholder';
import { ProductDetailCartControl } from '@/features/catalog/components/product-detail-cart-control';
import { ProductCard } from '@/features/catalog/components/product-card';
import { productImageAspectRatio } from '@/features/catalog/lib/product-image';
import { formatRsd } from '@/lib/money';
import {
  buildProductStructuredData,
  serializeJsonLd,
} from '@/lib/structured-data';
import {
  getPublicProductBySlug,
  getRelatedPublicProducts,
} from '@/server/queries/product';
import { getPublicChromeContent } from '@/server/queries/public-settings';

type ProductDetailsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product)
    return {
      title: 'Proizvod nije pronađen',
      robots: { index: false, follow: false },
    };
  const description = product.description.slice(0, 160);
  const url = `/proizvodi/${encodeURIComponent(product.slug)}`;
  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: product.name,
      description,
      images: product.imageUrl
        ? [{ url: product.imageUrl, alt: product.name }]
        : undefined,
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicChromeContent(),
  ]);

  if (!product) {
    notFound();
  }
  const relatedProducts = await getRelatedPublicProducts(
    product.category.id,
    product.id,
  );
  const productUrl = new URL(
    `/proizvodi/${encodeURIComponent(product.slug)}`,
    process.env.APP_URL ?? 'http://localhost:3000',
  ).href;
  const structuredData = buildProductStructuredData({
    product: {
      ...product,
      imageUrl: product.imageUrl
        ? new URL(
            product.imageUrl,
            process.env.APP_URL ?? 'http://localhost:3000',
          ).href
        : null,
    },
    url: productUrl,
    currencyCode: settings?.currencyCode ?? 'RSD',
  });

  return (
    <div className="py-10 sm:py-14 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <Container>
        <nav aria-label="Putanja do proizvoda" className="mb-8">
          <ol className="text-muted flex flex-wrap items-center gap-2 text-sm">
            <li>
              <Link
                href="/proizvodi"
                className="hover:text-primary underline-offset-4 hover:underline"
              >
                Proizvodi
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/proizvodi?category=${encodeURIComponent(product.category.slug)}`}
                className="hover:text-primary underline-offset-4 hover:underline"
              >
                {product.category.name}
              </Link>
            </li>
          </ol>
        </nav>

        <article className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div
            className="bg-surface-muted border-border relative aspect-square overflow-hidden rounded-2xl border"
            style={{
              aspectRatio:
                productImageAspectRatio(
                  product.imageWidth,
                  product.imageHeight,
                ) ?? '1 / 1',
            }}
          >
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <ProductImagePlaceholder productName={product.name} />
            )}
          </div>

          <div className="min-w-0 lg:py-4">
            <p className="text-primary text-sm font-semibold tracking-wider uppercase">
              {product.category.name}
            </p>
            <h1 className="text-foreground mt-3 text-4xl font-bold tracking-tight wrap-break-word sm:text-5xl">
              {product.name}
            </h1>

            <p className="text-foreground mt-6 text-2xl font-bold">
              {formatRsd(product.priceMinor)}
            </p>

            <div className="mt-6">
              {product.isAvailable ? (
                <p className="font-semibold text-emerald-700">Dostupno</p>
              ) : (
                <p className="font-semibold text-zinc-700">Rasprodato</p>
              )}
            </div>

            <p className="text-muted mt-8 text-base leading-8 wrap-break-word whitespace-pre-line">
              {product.description}
            </p>

            <div className="bg-surface-muted border-border mt-8 rounded-xl border p-4">
              <p className="font-bold">Preuzimanje u pekari</p>
              <p className="text-muted mt-1 text-sm">
                Termin biraš tokom poručivanja.
              </p>
            </div>

            <ProductDetailCartControl
              item={{
                productId: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                displayPriceMinor: product.priceMinor,
              }}
              isAvailable={product.isAvailable}
            />
          </div>
        </article>

        {relatedProducts.length > 0 ? (
          <section
            aria-labelledby="related-products-heading"
            className="mt-16 lg:mt-24"
          >
            <h2
              id="related-products-heading"
              className="text-3xl font-bold tracking-tight"
            >
              Možda će ti se dopasti
            </h2>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}

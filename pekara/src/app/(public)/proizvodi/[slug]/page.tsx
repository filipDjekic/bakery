import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { AddToCartButton } from '@/features/cart/components/add-to-cart-button';
import { ProductImagePlaceholder } from '@/features/catalog/components/product-image-placeholder';
import { formatRsd } from '@/lib/money';
import { getPublicProductBySlug } from '@/server/queries/product';

type ProductDetailsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProductDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) return { title: 'Proizvod nije pronađen', robots: { index: false, follow: false } };
  const description = product.description.slice(0, 160);
  const url = `/proizvodi/${encodeURIComponent(product.slug)}`;
  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: product.name, description, images: product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined },
  };
}

export default async function ProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="py-10 sm:py-14 lg:py-20">
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
          <div className="bg-surface-muted border-border relative aspect-square overflow-hidden rounded-2xl border">
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
            <h1 className="text-foreground mt-3 text-4xl font-bold tracking-tight break-words sm:text-5xl">
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

            <p className="text-muted mt-8 text-base leading-8 break-words whitespace-pre-line">
              {product.description}
            </p>

            <AddToCartButton
              item={{
                productId: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                displayPriceMinor: product.priceMinor,
              }}
              isAvailable={product.isAvailable}
              className="mt-10 w-full sm:max-w-64"
            />
          </div>
        </article>
      </Container>
    </div>
  );
}

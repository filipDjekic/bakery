import Image from 'next/image';
import Link from 'next/link';

import { AddToCartButton } from '@/features/cart/components/add-to-cart-button';
import { formatRsd } from '@/lib/money';
import type { CatalogProduct } from '@/server/queries/catalog';

import { ProductImagePlaceholder } from './product-image-placeholder';

type ProductCardProps = {
  product: CatalogProduct;
};

export function ProductCard({ product }: ProductCardProps) {
  const productHref = `/proizvodi/${encodeURIComponent(product.slug)}`;

  return (
    <article className="border-border bg-surface flex h-full min-w-0 flex-col overflow-hidden rounded-xl border shadow-sm">
      <Link
        href={productHref}
        aria-label={`Pogledaj proizvod ${product.name}`}
        className="bg-surface-muted focus-visible:ring-primary relative block aspect-square overflow-hidden focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-[1.02]"
          />
        ) : (
          <ProductImagePlaceholder productName={product.name} />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-foreground min-w-0 text-lg font-semibold">
            <Link
              href={productHref}
              className="hover:text-primary focus-visible:ring-primary wrap-break-words underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {product.name}
            </Link>
          </h3>

          {!product.isAvailable ? (
            <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-800">
              Rasprodato
            </span>
          ) : null}
        </div>

        <p className="text-muted wrap-break-words mt-3 line-clamp-3 text-sm leading-6">
          {product.description}
        </p>

        <div className="mt-auto pt-6">
          <p className="text-foreground text-lg font-bold">
            {formatRsd(product.priceMinor)}
          </p>

          <AddToCartButton
            item={{
              productId: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
              displayPriceMinor: product.priceMinor,
            }}
            isAvailable={product.isAvailable}
            className="mt-4"
          />
        </div>
      </div>
    </article>
  );
}

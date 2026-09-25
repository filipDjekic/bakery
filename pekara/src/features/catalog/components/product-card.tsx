import Image from 'next/image';
import Link from 'next/link';

import { cardVariants } from '@/components/ui/card';
import { focusRingInsetClassName } from '@/components/ui/focus';
import { cn } from '@/lib/cn';
import { formatRsd } from '@/lib/money';
import type { CatalogProduct } from '@/server/queries/catalog';

import { CompactCartControl } from './compact-cart-control';
import { ProductImagePlaceholder } from './product-image-placeholder';
import { productImageAspectRatio } from '../lib/product-image';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const productHref = `/proizvodi/${encodeURIComponent(product.slug)}`;

  return (
    <article
      className={cardVariants({
        variant: 'interactive',
        className:
          'group flex h-full min-w-0 flex-col overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md',
      })}
    >
      <Link
        href={productHref}
        aria-label={`Pogledaj proizvod ${product.name}`}
        className={cn(
          'bg-surface-muted relative block aspect-[4/3] overflow-hidden focus-visible:ring-inset',
          focusRingInsetClassName,
        )}
        style={{
          aspectRatio:
            productImageAspectRatio(product.imageWidth, product.imageHeight) ??
            '4 / 3',
        }}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 2.25rem), (max-width: 1279px) calc(33vw - 2.5rem), 20rem"
            className={`object-cover transition-transform duration-300 group-hover:scale-[1.02] ${product.isAvailable ? '' : 'opacity-60 saturate-50'}`}
          />
        ) : (
          <ProductImagePlaceholder productName={product.name} />
        )}
        {!product.isAvailable ? (
          <span className="absolute top-3 right-3 rounded-full bg-red-800 px-3 py-1 text-xs font-bold text-white shadow-sm">
            Rasprodato
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="text-foreground line-clamp-2 text-lg leading-6 font-bold">
          <Link
            href={productHref}
            className={cn(
              'hover:text-primary rounded-sm',
              focusRingInsetClassName,
            )}
          >
            {product.name}
          </Link>
        </h2>
        <p className="text-muted mt-2 line-clamp-2 text-sm leading-5">
          {product.description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="text-primary text-lg font-bold tabular-nums">
            {formatRsd(product.priceMinor)}
          </p>
          <CompactCartControl
            item={{
              productId: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
              displayPriceMinor: product.priceMinor,
            }}
            isAvailable={product.isAvailable}
          />
        </div>
      </div>
    </article>
  );
}

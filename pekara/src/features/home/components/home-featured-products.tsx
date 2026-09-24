import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { ProductCard } from '@/features/catalog/components/product-card';
import type { HomepageProduct } from '@/server/queries/home';

export function HomeFeaturedProducts({
  products,
}: {
  products: HomepageProduct[];
}) {
  return (
    <section aria-labelledby="featured-heading" className="py-16 lg:py-24">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
            Sveže iz peći
          </p>
          <h2
            id="featured-heading"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Najpopularnije danas
          </h2>
          <p className="text-muted mt-3 max-w-2xl">
            Otkrijte naše najtraženije proizvode koje kupci najviše vole.
          </p>
        </div>
        <Link
          href="/proizvodi"
          className="text-primary focus-visible:ring-primary hidden items-center gap-2 rounded-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none sm:flex"
        >
          Pogledaj sve proizvode <ArrowRight aria-hidden size={18} />
        </Link>
      </div>
      {products.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="border-border bg-surface text-muted mt-8 rounded-2xl border p-8 text-center">
          Trenutno nema dostupnih proizvoda.
        </p>
      )}
      <Link
        href="/proizvodi"
        className="border-border bg-surface focus-visible:ring-primary mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 font-semibold sm:hidden"
      >
        Pogledaj sve proizvode <ArrowRight aria-hidden size={18} />
      </Link>
    </section>
  );
}

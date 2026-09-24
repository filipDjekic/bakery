import Link from 'next/link';

import type { HomepageCategory } from '@/server/queries/home';

type HomeFeaturedProductsProps = {
  categories: HomepageCategory[];
};

export function HomeFeaturedProducts({
  categories,
}: HomeFeaturedProductsProps) {
  return (
    <section
      aria-labelledby="categories-heading"
      className="py-12 sm:py-16 lg:py-20"
    >
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
            Ponuda
          </p>

          <h2
            id="categories-heading"
            className="text-foreground mt-2 text-3xl font-bold tracking-tight"
          >
            Naše kategorije
          </h2>
        </div>

        <Link
          href="/proizvodi"
          className="hover:text-foreground hidden text-sm font-semibold text-zinc-700 underline-offset-4 hover:underline sm:block"
        >
          Svi proizvodi
        </Link>
      </div>

      {categories.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/proizvodi?category=${category.name.toLowerCase()}`}
              className="group border-border hover:bg-surface rounded-lg border p-6 transition-colors hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <h3 className="text-foreground text-lg font-semibold">
                {category.name}
              </h3>

              {category.description ? (
                <p className="text-muted mt-2 text-sm leading-6">
                  {category.description}
                </p>
              ) : null}

              <span className="group-hover:text-foreground mt-5 inline-block text-sm font-semibold text-zinc-700">
                Pogledaj proizvode →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border-border bg-surface mt-8 rounded-lg border p-6">
          <p className="text-muted">Trenutno nema dostupnih kategorija.</p>
        </div>
      )}

      <div className="mt-8 sm:hidden">
        <Link
          href="/proizvodi"
          className="text-foreground inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold"
        >
          Svi proizvodi
        </Link>
      </div>
    </section>
  );
}

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
            className="mt-2 text-3xl font-bold tracking-tight text-zinc-950"
          >
            Naše kategorije
          </h2>
        </div>

        <Link
          href="/proizvodi"
          className="hidden text-sm font-semibold text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline sm:block"
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
              className="group rounded-lg border border-zinc-200 p-6 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <h3 className="text-lg font-semibold text-zinc-950">
                {category.name}
              </h3>

              {category.description ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {category.description}
                </p>
              ) : null}

              <span className="mt-5 inline-block text-sm font-semibold text-zinc-700 group-hover:text-zinc-950">
                Pogledaj proizvode →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-zinc-600">Trenutno nema dostupnih kategorija.</p>
        </div>
      )}

      <div className="mt-8 sm:hidden">
        <Link
          href="/proizvodi"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-950"
        >
          Svi proizvodi
        </Link>
      </div>
    </section>
  );
}

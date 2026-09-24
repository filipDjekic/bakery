'use client';

import { Search, X } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import type { CatalogProduct } from '@/server/queries/catalog';

import { CatalogGrid } from './catalog-grid';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name';

export function CatalogBrowser({
  products,
  categoryFilter,
}: {
  products: CatalogProduct[];
  categoryFilter: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('default');
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('sr-Latn');
    const filtered = normalizedQuery
      ? products.filter((product) =>
          `${product.name} ${product.description}`
            .toLocaleLowerCase('sr-Latn')
            .includes(normalizedQuery),
        )
      : products;

    if (sort === 'default') return filtered;
    return [...filtered].sort((left, right) => {
      if (sort === 'price-asc') return left.priceMinor - right.priceMinor;
      if (sort === 'price-desc') return right.priceMinor - left.priceMinor;
      return left.name.localeCompare(right.name, 'sr-Latn');
    });
  }, [products, query, sort]);

  return (
    <>
      <header className="grid gap-7 lg:grid-cols-[1fr_minmax(20rem,28rem)] lg:items-end">
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
            Uvek sveže, uvek ukusno
          </p>
          <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Proizvodi
          </h1>
          <p className="text-muted mt-4 max-w-2xl text-lg leading-8">
            Otkrijte našu ponudu svežih peciva, hleba, bureka, kolača i još
            mnogo toga.
          </p>
        </div>
        <div className="w-full sm:max-w-md">
          <label htmlFor="catalog-search" className="sr-only">
            Pretraži proizvode
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted absolute top-1/2 left-3 -translate-y-1/2"
              size={19}
            />
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pretraži proizvode..."
              className="border-border bg-surface focus-visible:ring-primary min-h-12 w-full rounded-xl border py-3 pr-11 pl-10 shadow-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Obriši pretragu"
                className="text-muted hover:text-foreground focus-visible:ring-primary absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
              >
                <X aria-hidden size={17} />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="border-border mt-8 border-y py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">{categoryFilter}</div>
          <div className="flex shrink-0 items-center justify-between gap-4 lg:justify-end">
            <p className="text-muted text-sm">
              Prikazano {visibleProducts.length}{' '}
              {visibleProducts.length === 1 ? 'proizvod' : 'proizvoda'}
            </p>
            <div>
              <label htmlFor="catalog-sort" className="sr-only">
                Sortiranje proizvoda
              </label>
              <select
                id="catalog-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="border-border bg-surface focus-visible:ring-primary min-h-11 rounded-lg border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="default">Preporučeni</option>
                <option value="price-asc">Cena rastuće</option>
                <option value="price-desc">Cena opadajuće</option>
                <option value="name">Naziv</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {visibleProducts.length ? (
          <CatalogGrid products={visibleProducts} />
        ) : (
          <div className="border-border bg-surface rounded-2xl border px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-bold">
              Nema proizvoda koji odgovaraju pretrazi.
            </h2>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-primary focus-visible:ring-primary mt-4 min-h-11 rounded-lg px-4 font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Obriši pretragu
            </button>
          </div>
        )}
      </div>
    </>
  );
}

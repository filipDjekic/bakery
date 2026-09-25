import type { ReactNode } from 'react';

import { Search } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import type { CatalogProduct } from '@/server/queries/catalog';

import { CatalogGrid } from './catalog-grid';

export type CatalogSort = 'default' | 'price-asc' | 'price-desc' | 'name';

export function filterAndSortCatalogProducts(
  products: CatalogProduct[],
  query: string,
  sort: CatalogSort,
): CatalogProduct[] {
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
}

export function CatalogBrowser({
  products,
  categoryFilter,
  query,
  sort,
  selectedCategorySlug,
}: {
  products: CatalogProduct[];
  categoryFilter: ReactNode;
  query: string;
  sort: CatalogSort;
  selectedCategorySlug: string | null;
}) {
  const visibleProducts = filterAndSortCatalogProducts(products, query, sort);

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
        <form action="/proizvodi" className="w-full sm:max-w-md">
          {selectedCategorySlug ? (
            <input type="hidden" name="category" value={selectedCategorySlug} />
          ) : null}
          <label htmlFor="catalog-search" className="sr-only">
            Pretraži proizvode
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted absolute top-1/2 left-3 -translate-y-1/2"
              size={19}
            />
            <Input
              id="catalog-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Pretraži proizvode..."
              className="min-h-12 pr-24 pl-10 shadow-sm"
            />
            <button
              type="submit"
              className="text-primary focus-visible:ring-ring absolute top-1/2 right-2 min-h-9 -translate-y-1/2 rounded-lg px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              Pretraži
            </button>
          </div>
        </form>
      </header>

      <div className="border-border mt-8 border-y py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">{categoryFilter}</div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 lg:justify-end">
            <p className="text-muted text-sm">
              Prikazano {visibleProducts.length}{' '}
              {visibleProducts.length === 1 ? 'proizvod' : 'proizvoda'}
            </p>
            <form action="/proizvodi" className="flex items-center gap-2">
              {selectedCategorySlug ? (
                <input
                  type="hidden"
                  name="category"
                  value={selectedCategorySlug}
                />
              ) : null}
              {query ? <input type="hidden" name="q" value={query} /> : null}
              <label htmlFor="catalog-sort" className="sr-only">
                Sortiranje proizvoda
              </label>
              <Select
                id="catalog-sort"
                name="sort"
                defaultValue={sort}
                className="min-h-11 w-auto text-sm font-semibold"
              >
                <option value="default">Preporučeni</option>
                <option value="price-asc">Cena rastuće</option>
                <option value="price-desc">Cena opadajuće</option>
                <option value="name">Naziv</option>
              </Select>
              <button type="submit" className={buttonVariants({ size: 'sm' })}>
                Primeni
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {visibleProducts.length ? (
          <CatalogGrid products={visibleProducts} />
        ) : (
          <div className="border-border bg-surface rounded-2xl border px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-bold">
              Nema proizvoda koji odgovaraju pretrazi
              {query ? ` „${query}“` : ''}.
            </h2>
            <Link
              href={
                selectedCategorySlug
                  ? `/proizvodi?category=${encodeURIComponent(selectedCategorySlug)}`
                  : '/proizvodi'
              }
              className={buttonVariants({
                variant: 'outline',
                className: 'mt-4',
              })}
            >
              Obriši pretragu i sortiranje
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

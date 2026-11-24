import Link from 'next/link';

import type { CatalogCategoryFilterOption } from '@/server/queries/catalog';

type CategoryFilterProps = {
  categories: CatalogCategoryFilterOption[];
  selectedCategorySlug: string | null;
  query?: string;
  sort?: string;
};

function filterLinkClass(isSelected: boolean): string {
  return [
    'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
    'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    isSelected
      ? 'border-primary bg-primary text-white shadow-sm'
      : 'border-border bg-surface text-foreground hover:border-primary hover:text-primary',
  ].join(' ');
}

export function CategoryFilter({
  categories,
  selectedCategorySlug,
  query = '',
  sort = 'default',
}: CategoryFilterProps) {
  const href = (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (query) params.set('q', query);
    if (sort !== 'default') params.set('sort', sort);
    return `/proizvodi${params.size ? '?' + params : ''}`;
  };
  if (categories.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Filtriranje proizvoda po kategoriji">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <li>
          <Link
            href={href()}
            aria-current={selectedCategorySlug === null ? 'page' : undefined}
            className={filterLinkClass(selectedCategorySlug === null)}
          >
            Sve
          </Link>
        </li>

        {categories.map((category) => {
          const isSelected = category.slug === selectedCategorySlug;

          return (
            <li key={category.id}>
              <Link
                href={href(category.slug)}
                aria-current={isSelected ? 'page' : undefined}
                className={filterLinkClass(isSelected)}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

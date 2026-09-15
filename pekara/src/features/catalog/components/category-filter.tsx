import Link from 'next/link';

import type { CatalogCategoryFilterOption } from '@/server/queries/catalog';

type CategoryFilterProps = {
  categories: CatalogCategoryFilterOption[];
  selectedCategorySlug: string | null;
};

function filterLinkClass(isSelected: boolean): string {
  return [
    'inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
    'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    isSelected
      ? 'border-primary bg-primary text-white'
      : 'border-border bg-surface text-foreground hover:border-primary hover:text-primary',
  ].join(' ');
}

export function CategoryFilter({
  categories,
  selectedCategorySlug,
}: CategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Filtriranje proizvoda po kategoriji">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/proizvodi"
            aria-current={selectedCategorySlug === null ? 'page' : undefined}
            className={filterLinkClass(selectedCategorySlug === null)}
          >
            Sve kategorije
          </Link>
        </li>

        {categories.map((category) => {
          const isSelected = category.slug === selectedCategorySlug;

          return (
            <li key={category.id}>
              <Link
                href={`/proizvodi?category=${encodeURIComponent(category.slug)}`}
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

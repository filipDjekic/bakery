import { CreditCard, PackageCheck, ShoppingBasket, Wheat } from 'lucide-react';

import { Container } from '@/components/layout/container';
import { CatalogBrowser } from '@/features/catalog/components/catalog-browser';
import { CatalogEmptyState } from '@/features/catalog/components/catalog-empty-state';
import { CategoryFilter } from '@/features/catalog/components/category-filter';
import { getPublicCatalog } from '@/server/queries/catalog';

type ProductsPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const categoryParam = (await searchParams).category;
  const requestedCategorySlug =
    typeof categoryParam === 'string' ? categoryParam : undefined;
  const { categories, filterCategories, selectedCategorySlug } =
    await getPublicCatalog(requestedCategorySlug);
  const products = categories.flatMap((category) => category.products);

  return (
    <div className="py-10 sm:py-12 lg:py-16">
      <Container>
        {products.length || filterCategories.length ? (
          <CatalogBrowser
            products={products}
            categoryFilter={
              <CategoryFilter
                categories={filterCategories}
                selectedCategorySlug={selectedCategorySlug}
              />
            }
          />
        ) : (
          <CatalogEmptyState />
        )}

        <section
          aria-label="Prednosti poručivanja"
          className="border-border bg-surface-muted mt-14 grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: 'Sveže pripremljeno', icon: Wheat },
            { label: 'Online poručivanje', icon: ShoppingBasket },
            { label: 'Preuzimanje bez čekanja', icon: PackageCheck },
            { label: 'Plaćanje pri preuzimanju', icon: CreditCard },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="bg-surface flex items-center gap-3 p-5 text-sm font-semibold"
            >
              <span className="bg-surface-muted text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full">
                <Icon aria-hidden size={19} />
              </span>
              {label}
            </div>
          ))}
        </section>
      </Container>
    </div>
  );
}

import type { CatalogCategory } from '@/server/queries/catalog';

import { CatalogEmptyState } from './catalog-empty-state';
import { ProductCard } from './product-card';

type CatalogGridProps = {
  categories: CatalogCategory[];
};

export function CatalogGrid({ categories }: CatalogGridProps) {
  const categoriesWithProducts = categories.filter(
    (category) => category.products.length > 0,
  );

  if (categoriesWithProducts.length === 0) {
    return <CatalogEmptyState />;
  }

  return (
    <div className="space-y-14 sm:space-y-16">
      {categoriesWithProducts.map((category) => (
        <section key={category.id} aria-labelledby={`category-${category.id}`}>
          <div className="max-w-2xl">
            <h2
              id={`category-${category.id}`}
              className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl"
            >
              {category.name}
            </h2>

            {category.description ? (
              <p className="text-muted mt-3 leading-7">
                {category.description}
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {category.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

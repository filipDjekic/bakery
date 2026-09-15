import { Container } from '@/components/layout/container';
import { CatalogGrid } from '@/features/catalog/components/catalog-grid';
import { CategoryFilter } from '@/features/catalog/components/category-filter';
import { getPublicCatalog } from '@/server/queries/catalog';

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
  }>;
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const categoryParam = (await searchParams).category;
  const requestedCategorySlug =
    typeof categoryParam === 'string' ? categoryParam : undefined;
  const { categories, filterCategories, selectedCategorySlug } =
    await getPublicCatalog(requestedCategorySlug);

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <header className="max-w-3xl">
          <p className="text-primary text-sm font-semibold tracking-wider uppercase">
            Sveža ponuda
          </p>
          <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Proizvodi
          </h1>
          <p className="text-muted mt-5 text-lg leading-8">
            Pregledajte našu ponudu sveže pripremljenih pekarskih proizvoda.
          </p>
        </header>

        <div className="mt-10">
          <CategoryFilter
            categories={filterCategories}
            selectedCategorySlug={selectedCategorySlug}
          />
        </div>

        <div className="mt-12">
          <CatalogGrid categories={categories} />
        </div>
      </Container>
    </div>
  );
}

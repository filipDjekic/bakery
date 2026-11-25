import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ProductsTable } from '@/features/admin-products/components/products-table';
import {
  getAdminProductsPage,
  getAdminCategoryOptions,
} from '@/server/queries/admin-products';
import { ListFilters } from '@/components/ui/list-filters';
import { ListPagination } from '@/components/ui/list-pagination';
import { getPickupBakerySettings } from '@/server/repositories/bakery-settings';
import type { SearchParams } from '@/lib/list-query';

export const instant = false;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [result, categories, settings] = await Promise.all([
    getAdminProductsPage(await searchParams),
    getAdminCategoryOptions(),
    getPickupBakerySettings(),
  ]);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Proizvodi</h1>
          <p className="text-muted mt-1 text-sm">
            Aktivni, neaktivni i rasprodati proizvodi na jednom mestu.
          </p>
        </div>
        <Link href="/admin/products/new" className={buttonVariants()}>
          Novi proizvod
        </Link>
      </div>
      <ListFilters
        fields={[
          {
            name: 'category',
            label: 'Kategorija',
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: 'active',
            label: 'Status',
            options: [
              { value: 'true', label: 'Aktivan' },
              { value: 'false', label: 'Neaktivan' },
            ],
          },
          {
            name: 'available',
            label: 'Dostupnost',
            options: [
              { value: 'true', label: 'Dostupan' },
              { value: 'false', label: 'Nedostupan' },
            ],
          },
        ]}
      />
      <ProductsTable products={result.items} timezone={settings.timezone} />
      <ListPagination
        pathname="/admin/products"
        pagination={result.pagination}
        filters={result.filters}
      />
    </div>
  );
}

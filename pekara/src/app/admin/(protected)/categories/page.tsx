import Link from 'next/link';

import { CategoriesTable } from '@/features/categories/components/categories-table';
import { getAdminCategoriesPage } from '@/server/queries/admin-categories';
import { ListFilters } from '@/components/ui/list-filters';
import { ListPagination } from '@/components/ui/list-pagination';
import { getPickupBakerySettings } from '@/server/repositories/bakery-settings';
import type { SearchParams } from '@/lib/list-query';

export const instant = false;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [result, settings] = await Promise.all([
    getAdminCategoriesPage(await searchParams),
    getPickupBakerySettings(),
  ]);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kategorije</h1>
          <p className="text-muted mt-1 text-sm">
            Upravljajte redosledom i vidljivošću kataloga.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="bg-primary hover:bg-primary-hover rounded-md px-4 py-2 font-semibold text-white"
        >
          Nova kategorija
        </Link>
      </div>
      <ListFilters
        fields={[
          {
            name: 'active',
            label: 'Status',
            options: [
              { value: 'true', label: 'Aktivna' },
              { value: 'false', label: 'Neaktivna' },
            ],
          },
        ]}
      />
      <CategoriesTable categories={result.items} timezone={settings.timezone} />
      <ListPagination
        pathname="/admin/categories"
        pagination={result.pagination}
        filters={{ q: result.filters.q, active: result.filters.active }}
      />
    </div>
  );
}

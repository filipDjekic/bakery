import Link from 'next/link';

import { CategoriesTable } from '@/features/categories/components/categories-table';
import { getAdminCategories } from '@/server/queries/admin-categories';

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
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
      <CategoriesTable categories={categories} />
    </div>
  );
}

import { formatDateTime } from '@/lib/datetime';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminCategoryRow } from '../../../server/queries/admin-categories';

export function CategoriesTable({
  categories,
  timezone,
}: {
  categories: AdminCategoryRow[];
  timezone?: string;
}) {
  if (categories.length === 0)
    return (
      <EmptyState
        title="Nema kategorija za izabrane filtere"
        description="Promenite pretragu ili filtere, ili dodajte novu kategoriju."
        action={
          <Link href="/admin/categories/new" className={buttonVariants()}>
            Dodaj kategoriju
          </Link>
        }
      />
    );
  return (
    <div className="border-border bg-surface relative overflow-x-auto rounded-xl border">
      <table className="w-full min-w-3xl text-left text-sm">
        <thead className="bg-surface-muted text-muted">
          <tr>
            <th className="px-4 py-3">Redosled</th>
            <th className="px-4 py-3">Naziv</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Proizvodi</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Ažurirana</th>
            <th className="px-4 py-3">
              <span className="sr-only">Akcije</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {categories.map((category) => (
            <tr
              key={category.id}
              className={
                !category.isActive ? 'bg-surface text-muted' : undefined
              }
            >
              <td className="px-4 py-3 tabular-nums">{category.sortOrder}</td>
              <td className="px-4 py-3 font-semibold">{category.name}</td>
              <td className="px-4 py-3">{category.slug}</td>
              <td className="px-4 py-3">
                {category.productCount} ukupno / {category.activeProductCount}{' '}
                aktivno
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    category.isActive
                      ? 'rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-900'
                      : 'rounded bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-800'
                  }
                >
                  {category.isActive ? 'Aktivna' : 'Neaktivna'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDateTime(category.updatedAt, timezone)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/categories/${category.id}`}
                  className="text-primary font-semibold underline underline-offset-4"
                >
                  Izmeni
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

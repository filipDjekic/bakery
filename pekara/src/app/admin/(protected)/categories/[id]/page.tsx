import { notFound } from 'next/navigation';

import { CategoryForm } from '@/features/categories/components/category-form';
import { getAdminCategory } from '@/server/queries/admin-categories';

export const instant = false;

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getAdminCategory(id);
  if (!category) notFound();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Izmeni kategoriju</h1>
        <p className="text-muted mt-1 text-sm">
          Deaktivirana kategorija i njeni proizvodi neće biti javno vidljivi.
        </p>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}

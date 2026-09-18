import { CategoryForm } from '@/features/categories/components/category-form';

export default function NewCategoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nova kategorija</h1>
        <p className="text-muted mt-1 text-sm">
          Slug će biti normalizovan pre čuvanja.
        </p>
      </div>
      <CategoryForm />
    </div>
  );
}

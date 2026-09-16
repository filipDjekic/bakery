import { ProductForm } from '@/features/admin-products/components/product-form';
import { getAdminCategoryOptions } from '@/server/queries/admin-products';

export default async function NewProductPage() {
  const categories = await getAdminCategoryOptions();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Novi proizvod</h1>
        <p className="text-muted mt-1 text-sm">
          Aktivan proizvod mora imati validnu sliku.
        </p>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}

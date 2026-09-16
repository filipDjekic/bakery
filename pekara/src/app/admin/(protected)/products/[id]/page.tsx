import { notFound } from 'next/navigation';

import { ProductForm } from '@/features/admin-products/components/product-form';
import {
  getAdminCategoryOptions,
  getAdminProduct,
} from '@/server/queries/admin-products';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getAdminCategoryOptions(),
  ]);
  if (!product) notFound();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Izmeni proizvod</h1>
        <p className="text-muted mt-1 text-sm">
          Promena naziva ne menja slug dok to eksplicitno ne potvrdite.
        </p>
      </div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}

import Link from 'next/link';

import { ProductsTable } from '@/features/admin-products/components/products-table';
import { getAdminProducts } from '@/server/queries/admin-products';

export const instant = false;

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Proizvodi</h1>
          <p className="text-muted mt-1 text-sm">
            Aktivni, neaktivni i rasprodati proizvodi na jednom mestu.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-primary hover:bg-primary-hover rounded-md px-4 py-2 font-semibold text-white"
        >
          Novi proizvod
        </Link>
      </div>
      <ProductsTable products={products} />
    </div>
  );
}

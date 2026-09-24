import type { CatalogProduct } from '@/server/queries/catalog';

import { ProductCard } from './product-card';

export function CatalogGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

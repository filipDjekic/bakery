import Image from 'next/image';
import Link from 'next/link';

import { formatRsd } from '../../../lib/money';
import type { AdminProductRow } from '../../../server/queries/admin-products';
import { ProductToggles } from './product-toggles';

export function ProductsTable({ products }: { products: AdminProductRow[] }) {
  if (products.length === 0)
    return (
      <div className="border-border bg-surface text-muted rounded-xl border px-6 py-14 text-center">
        Nema proizvoda.
      </div>
    );
  return (
    <div className="border-border bg-surface overflow-x-auto rounded-xl border">
      <table className="w-full min-w-5xl text-left text-sm">
        <thead className="bg-surface-muted text-muted">
          <tr>
            <th className="px-4 py-3">Slika</th>
            <th className="px-4 py-3">Naziv</th>
            <th className="px-4 py-3">Kategorija</th>
            <th className="px-4 py-3 text-right">Cena</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Ažuriran</th>
            <th className="px-4 py-3">
              <span className="sr-only">Akcije</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {products.map((product) => (
            <tr
              key={product.id}
              className={
                !product.isActive ? 'bg-surface text-muted' : undefined
              }
            >
              <td className="px-4 py-3">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                ) : (
                  <div
                    className="bg-surface-muted h-14 w-14 rounded-md"
                    aria-label="Nema slike"
                  />
                )}
              </td>
              <td className="px-4 py-3 font-semibold">
                {product.name}
                {!product.isActive ? (
                  <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-xs">
                    Neaktivan
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {product.categoryName}
                {!product.categoryIsActive ? (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                    Neaktivna kategorija
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatRsd(product.priceMinor)}
              </td>
              <td className="px-4 py-3">
                <ProductToggles
                  id={product.id}
                  isActive={product.isActive}
                  isAvailable={product.isAvailable}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {new Intl.DateTimeFormat('sr-Latn-RS', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(product.updatedAt))}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/products/${product.id}`}
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

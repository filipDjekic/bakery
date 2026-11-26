import { formatDateTime } from '@/lib/datetime';
import Image from 'next/image';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRsd } from '../../../lib/money';
import type { AdminProductRow } from '../../../server/queries/admin-products';
import { ProductToggles } from './product-toggles';

export function ProductsTable({
  products,
  timezone,
}: {
  products: AdminProductRow[];
  timezone?: string;
}) {
  if (products.length === 0)
    return (
      <EmptyState
        title="Nema proizvoda za izabrane filtere"
        description="Promenite pretragu ili filtere, ili dodajte novi proizvod."
        action={
          <Link href="/admin/products/new" className={buttonVariants()}>
            Dodaj proizvod
          </Link>
        }
      />
    );
  return (
    <>
      <ul className="space-y-4 lg:hidden" aria-label="Proizvodi">
        {products.map((product) => (
          <li
            key={product.id}
            className="border-border bg-surface rounded-xl border p-4"
          >
            <div className="flex items-start gap-3">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  width={72}
                  height={72}
                  alt=""
                  className="size-18 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  role="img"
                  aria-label="Nema slike"
                  className="bg-surface-muted size-18 shrink-0 rounded-lg"
                />
              )}
              <h2 className="text-lg font-bold">{product.name}</h2>
            </div>
            <p className="text-muted mt-1 text-sm">
              {product.categoryName}
              {!product.categoryIsActive ? ' · neaktivna kategorija' : ''}
            </p>
            <p className="my-3 font-bold">{formatRsd(product.priceMinor)}</p>
            <ProductToggles
              id={product.id}
              key={`${product.id}-${product.updatedAt}`}
              updatedAt={product.updatedAt}
              categoryIsActive={product.categoryIsActive}
              isActive={product.isActive}
              isAvailable={product.isAvailable}
            />
            <Link
              href={`/admin/products/${product.id}`}
              className="text-primary mt-4 inline-flex min-h-11 items-center font-bold underline"
            >
              Izmeni <span className="sr-only">{product.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-border bg-surface relative hidden overflow-x-auto rounded-xl border lg:block">
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
                      role="img"
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
                    key={`${product.id}-${product.updatedAt}`}
                    updatedAt={product.updatedAt}
                    categoryIsActive={product.categoryIsActive}
                    isActive={product.isActive}
                    isAvailable={product.isAvailable}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDateTime(product.updatedAt, timezone)}
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
    </>
  );
}

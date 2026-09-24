import Link from 'next/link';

import type { AdminOrdersResult } from '@/server/queries/admin-orders';

import { OrderMobileCards } from './order-mobile-cards';
import { OrdersTable } from './orders-table';

export function OrdersHistory({
  result,
  nowIso,
}: {
  result: AdminOrdersResult;
  nowIso: string;
}) {
  if (result.orders.length === 0) {
    return (
      <div className="border-border bg-surface rounded-xl border px-6 py-14 text-center">
        <p className="text-muted">Nema porudžbina za izabrane filtere.</p>
        <Link
          href="/admin/orders?view=all"
          className="text-primary focus-visible:ring-primary mt-4 inline-flex min-h-11 items-center rounded-md px-3 font-bold underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Obriši filtere
        </Link>
      </div>
    );
  }
  return (
    <>
      <OrderMobileCards
        orders={result.orders}
        timezone={result.timezone}
        nowIso={nowIso}
      />
      <div className="hidden lg:block">
        <OrdersTable orders={result.orders} timezone={result.timezone} />
      </div>
    </>
  );
}

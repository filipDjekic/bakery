import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
      <EmptyState
        title="Nema porudžbina za izabrane filtere"
        description="Promenite period ili status, ili obrišite sve filtere."
        action={
          <Link
            href="/admin/orders?view=all"
            className={buttonVariants({ variant: 'outline' })}
          >
            Obriši filtere
          </Link>
        }
      />
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

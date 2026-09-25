import { DateTime } from 'luxon';
import Link from 'next/link';
import { connection } from 'next/server';

import { buttonVariants } from '@/components/ui/button';
import { ActiveOrderQueue } from '@/features/admin-orders/components/active-order-queue';
import { OrderFilters } from '@/features/admin-orders/components/order-filters';
import { OrdersHistory } from '@/features/admin-orders/components/orders-history';
import { OrdersPagination } from '@/features/admin-orders/components/orders-pagination';
import {
  getActiveAdminOrders,
  getAdminOrders,
} from '@/server/queries/admin-orders';

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function tabClass(active: boolean): string {
  return buttonVariants({ variant: active ? 'primary' : 'outline' });
}

export const instant = false;

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const params = await searchParams;
  const view = first(params.view) === 'active' ? 'active' : 'all';
  await connection();
  const nowIso = DateTime.utc().toISO();
  const tabs = (
    <nav aria-label="Prikaz porudžbina" className="mb-6 flex flex-wrap gap-2">
      <Link
        href="/admin/orders?view=active"
        aria-current={view === 'active' ? 'page' : undefined}
        className={tabClass(view === 'active')}
      >
        Aktivne
      </Link>
      <Link
        href="/admin/orders?view=all"
        aria-current={view === 'all' ? 'page' : undefined}
        className={tabClass(view === 'all')}
      >
        Sve porudžbine
      </Link>
    </nav>
  );

  if (view === 'active') {
    const result = await getActiveAdminOrders();
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-foreground text-2xl font-bold">Porudžbine</h1>
          <p className="text-muted mt-1 text-sm">
            Operativni red prema vremenu preuzimanja.
          </p>
        </header>
        {tabs}
        <ActiveOrderQueue {...result} nowIso={nowIso} />
      </div>
    );
  }

  const result = await getAdminOrders({
    page: first(params.page),
    status: first(params.status),
    from: first(params.from),
    to: first(params.to),
  });
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold">Porudžbine</h1>
        <p className="text-muted mt-1 text-sm">
          Najnovije porudžbine su prikazane prve.
        </p>
      </header>
      {tabs}
      <OrderFilters filters={result.filters} />
      <div className="mt-6">
        <OrdersHistory result={result} nowIso={nowIso} />
        {result.orders.length > 0 ? (
          <OrdersPagination
            pagination={result.pagination}
            filters={result.filters}
          />
        ) : null}
      </div>
    </div>
  );
}

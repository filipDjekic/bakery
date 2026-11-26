import { DateTime } from 'luxon';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { ListPagination } from '@/components/ui/list-pagination';
import { OrderPrice } from '@/features/orders/components/order-price';
import type { ActiveAdminOrdersResult } from '@/server/queries/admin-orders';
import { formatPickupCountdown, formatPickupDayTime } from '../lib/order-time';
import { OrderStatusBadge } from './order-status-badge';
export function ActiveOrderQueue({
  orders,
  timezone,
  nowIso,
  page = 1,
  totalPages = 1,
  totalItems = orders.length,
  pathname = '/admin/orders',
}: ActiveAdminOrdersResult & { nowIso: string; pathname?: string }) {
  const filters: Record<string, string> =
    pathname === '/admin/orders' ? { view: 'active' } : {};
  const returnTo = `${pathname}?${new URLSearchParams({ ...filters, page: String(page) })}`;
  const now = DateTime.fromISO(nowIso, { zone: 'utc' });
  return (
    <section aria-labelledby="active-queue-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="active-queue-heading" className="text-xl font-bold">
          Aktivne porudžbine
        </h2>
        <p className="text-muted text-sm">
          {orders.length} od {totalItems} porudžbina · najbliže preuzimanje prvo
        </p>
      </div>
      {orders.length === 0 ? (
        <EmptyState
          title="Nema aktivnih porudžbina."
          description="Trenutno nema porudžbina koje čekaju obradu ili preuzimanje."
          action={
            <Link
              className="text-primary underline"
              href="/admin/orders?view=all"
            >
              Pogledaj sve porudžbine
            </Link>
          }
        />
      ) : (
        <ol className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {orders.map((order) => {
            const pickup = formatPickupDayTime(order.pickupAt, timezone, now);
            const countdown = formatPickupCountdown(order.pickupAt, now);
            const overdue =
              order.status === 'LATE' || countdown.startsWith('Kasni');
            return (
              <li
                key={order.id}
                className={`min-w-0 rounded-xl border p-4 ${overdue ? 'border-red-400 bg-red-50/40' : 'border-border bg-surface'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-bold">{order.orderNumber}</h3>
                  <OrderStatusBadge
                    status={order.status}
                    lateDiscountAt={order.lateDiscountAt}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold">{pickup.label}</p>
                <p
                  className={`text-xs ${overdue ? 'font-semibold text-red-800' : 'text-muted'}`}
                >
                  {countdown}
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="truncate text-sm">{order.customerName}</p>
                  <div className="shrink-0 text-right text-sm">
                    <OrderPrice {...order} />
                  </div>
                </div>
                <Link
                  prefetch={false}
                  href={`/admin/orders/${order.id}?returnTo=${encodeURIComponent(returnTo)}`}
                  className="border-border hover:bg-surface-muted focus-visible:ring-primary mt-3 flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-semibold focus-visible:ring-2"
                >
                  Otvori{' '}
                  <span className="sr-only">
                    porudžbinu {order.orderNumber}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      <ListPagination
        pathname={pathname}
        filters={filters}
        pagination={{ page, pageSize: 10, totalPages, totalItems }}
      />
    </section>
  );
}

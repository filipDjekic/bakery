import { DateTime } from 'luxon';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRsd } from '@/lib/money';
import type { ActiveAdminOrdersResult } from '@/server/queries/admin-orders';

import { formatPickupCountdown, formatPickupDayTime } from '../lib/order-time';
import { OrderStatusBadge } from './order-status-badge';

export function ActiveOrderQueue({
  orders,
  timezone,
  nowIso,
}: ActiveAdminOrdersResult & { nowIso: string }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title="Nema aktivnih porudžbina."
        description="Trenutno nema porudžbina koje čekaju obradu ili preuzimanje."
        action={
          <Link
            href="/admin/orders?view=all"
            className={buttonVariants({ variant: 'outline' })}
          >
            Pogledaj sve porudžbine
          </Link>
        }
      />
    );
  }
  const now = DateTime.fromISO(nowIso, { zone: 'utc' });
  return (
    <section aria-labelledby="active-queue-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="active-queue-heading" className="text-xl font-bold">
            Aktivne porudžbine
          </h2>
          <p className="text-muted text-sm">
            {orders.length} porudžbina · najbliže preuzimanje prvo
          </p>
        </div>
      </div>
      <ol className="grid gap-4 xl:grid-cols-2">
        {orders.map((order) => {
          const pickup = formatPickupDayTime(order.pickupAt, timezone, now);
          const countdown = formatPickupCountdown(order.pickupAt, now);
          const overdue = countdown.startsWith('Kasni');
          return (
            <li
              key={order.id}
              className={`bg-surface min-w-0 rounded-xl border p-5 shadow-sm ${overdue ? 'border-red-400' : 'border-border'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold tabular-nums">
                    {pickup.time}
                  </p>
                  <p className="text-muted mt-1 text-sm">{pickup.label}</p>
                  <p
                    className={`mt-1 font-bold ${overdue ? 'text-red-700' : 'text-primary'}`}
                  >
                    {countdown}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-zinc-100 pt-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold break-words">
                    {order.orderNumber}
                  </h3>
                  <p className="text-muted mt-1 break-words">
                    {order.customerName}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  {formatRsd(order.totalMinor)}
                </p>
              </div>
              <Link
                href={`/admin/orders/${order.id}`}
                className="bg-primary focus-visible:ring-primary mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 font-bold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Otvori{' '}
                <span className="sr-only">porudžbinu {order.orderNumber}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

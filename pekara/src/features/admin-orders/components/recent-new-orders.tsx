import { DateTime } from 'luxon';

import { formatRsd } from '@/lib/money';
import type { AdminDashboardData } from '@/server/queries/admin-dashboard';

type RecentNewOrdersProps = {
  orders: AdminDashboardData['recentNewOrders'];
  timezone: string;
};

function localTime(value: string, timezone: string): string {
  return DateTime.fromISO(value, { zone: 'utc' })
    .setZone(timezone)
    .setLocale('sr-Latn')
    .toFormat('dd. LLL yyyy. HH:mm');
}

export function RecentNewOrders({ orders, timezone }: RecentNewOrdersProps) {
  return (
    <section className="border-border bg-surface rounded-xl border">
      <div className="border-border border-b px-5 py-4 sm:px-6">
        <h2 className="text-foreground text-xl font-semibold">
          Najnovije porudžbine
        </h2>
      </div>
      {orders.length === 0 ? (
        <p className="text-muted px-5 py-10 text-center sm:px-6">
          Trenutno nema novih porudžbina.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {orders.map((order) => (
            <li
              key={order.id}
              className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"
            >
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-muted mt-1 text-sm">
                  {order.customerName} · preuzimanje{' '}
                  {localTime(order.pickupAt, timezone)}
                </p>
              </div>
              <p className="font-semibold tabular-nums">
                {formatRsd(order.totalMinor)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

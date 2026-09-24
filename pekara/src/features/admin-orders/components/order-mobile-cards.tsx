import { DateTime } from 'luxon';
import Link from 'next/link';

import { isActiveOrderStatus } from '@/config/order-status';
import { formatRsd } from '@/lib/money';
import type { AdminOrdersResult } from '@/server/queries/admin-orders';

import {
  formatAdminOrderTime,
  formatCreatedAge,
  formatPickupCountdown,
  formatPickupDayTime,
} from '../lib/order-time';
import { OrderStatusBadge } from './order-status-badge';

export function OrderMobileCards({
  orders,
  timezone,
  nowIso,
}: {
  orders: AdminOrdersResult['orders'];
  timezone: string;
  nowIso: string;
}) {
  const now = DateTime.fromISO(nowIso, { zone: 'utc' });
  return (
    <ul aria-label="Porudžbine" className="space-y-4 lg:hidden">
      {orders.map((order) => {
        const pickup = formatPickupDayTime(order.pickupAt, timezone, now);
        return (
          <li
            key={order.id}
            className="border-border bg-surface min-w-0 rounded-xl border p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold tabular-nums">{pickup.time}</p>
                <p className="text-muted mt-1 text-sm">{pickup.label}</p>
                {isActiveOrderStatus(order.status) ? (
                  <p className="mt-1 text-sm font-bold">
                    {formatPickupCountdown(order.pickupAt, now)}
                  </p>
                ) : null}
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <h2 className="mt-5 text-lg font-bold break-words">
              {order.orderNumber}
            </h2>
            <p className="mt-1 break-words">{order.customerName}</p>
            <dl className="border-border mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted text-xs font-bold uppercase">
                  Ukupno
                </dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {formatRsd(order.totalMinor)}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-bold uppercase">
                  Kreirana
                </dt>
                <dd className="text-muted mt-1 text-sm">
                  {formatCreatedAge(order.createdAt, now)}
                  <span className="sr-only">
                    {' '}
                    ({formatAdminOrderTime(order.createdAt, timezone)})
                  </span>
                </dd>
              </div>
            </dl>
            <Link
              href={`/admin/orders/${order.id}`}
              className="border-border hover:bg-surface-muted focus-visible:ring-primary mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 font-bold focus-visible:ring-2 focus-visible:outline-none"
            >
              Otvori porudžbinu{' '}
              <span className="sr-only">{order.orderNumber}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

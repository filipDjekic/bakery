import { formatDateTime } from '@/lib/datetime';
import Link from 'next/link';

import { OrderPrice } from '@/features/orders/components/order-price';
import type { AdminOrdersResult } from '@/server/queries/admin-orders';

import { OrderStatusBadge } from './order-status-badge';

type OrdersTableProps = {
  orders: AdminOrdersResult['orders'];
  timezone: string;
  returnTo?: string;
};

function localTime(value: string, timezone: string): string {
  return formatDateTime(value, timezone);
}

export function OrdersTable({
  orders,
  timezone,
  returnTo = '/admin/orders?view=all',
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="border-border bg-surface text-muted rounded-xl border px-6 py-14 text-center">
        Nema porudžbina za izabrane filtere.
      </div>
    );
  }

  return (
    <div className="border-border bg-surface overflow-x-auto rounded-xl border">
      <table className="w-full min-w-4xl border-collapse text-left text-sm">
        <thead className="bg-surface-muted text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Broj</th>
            <th className="px-4 py-3 font-semibold">Kreirana</th>
            <th className="px-4 py-3 font-semibold">Preuzimanje</th>
            <th className="px-4 py-3 font-semibold">Kupac</th>
            <th className="px-4 py-3 text-right font-semibold">Ukupno</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3 font-semibold whitespace-nowrap">
                <Link
                  prefetch={false}
                  className="underline"
                  href={`/admin/orders/${order.id}?returnTo=${encodeURIComponent(returnTo)}`}
                >
                  {order.orderNumber}
                </Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {localTime(order.createdAt, timezone)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {localTime(order.pickupAt, timezone)}
              </td>
              <td className="px-4 py-3">{order.customerName}</td>
              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                <OrderPrice {...order} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <OrderStatusBadge
                  status={order.status}
                  lateDiscountAt={order.lateDiscountAt}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

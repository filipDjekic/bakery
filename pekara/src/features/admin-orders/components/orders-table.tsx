import { DateTime } from 'luxon';

import { formatRsd } from '@/lib/money';
import type { AdminOrdersResult } from '@/server/queries/admin-orders';

type OrdersTableProps = {
  orders: AdminOrdersResult['orders'];
  timezone: string;
};

const statusLabels: Record<
  AdminOrdersResult['orders'][number]['status'],
  string
> = {
  NEW: 'Nova',
  ACCEPTED: 'Prihvaćena',
  IN_PREPARATION: 'U pripremi',
  READY: 'Spremna',
  COMPLETED: 'Završena',
  CANCELLED: 'Otkazana',
};

function localTime(value: string, timezone: string): string {
  return DateTime.fromISO(value, { zone: 'utc' })
    .setZone(timezone)
    .setLocale('sr-Latn')
    .toFormat('dd. LLL yyyy. HH:mm');
}

export function OrdersTable({ orders, timezone }: OrdersTableProps) {
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
                {order.orderNumber}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {localTime(order.createdAt, timezone)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {localTime(order.pickupAt, timezone)}
              </td>
              <td className="px-4 py-3">{order.customerName}</td>
              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                {formatRsd(order.totalMinor)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {statusLabels[order.status]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

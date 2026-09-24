import { DateTime } from 'luxon';
import { notFound } from 'next/navigation';

import { OrderStatusActions } from '@/features/admin-orders/components/order-status-actions';
import { OrderStatusBadge } from '@/features/admin-orders/components/order-status-badge';
import { formatRsd } from '@/lib/money';
import { getAdminOrder } from '@/server/queries/admin-order';
import { getPickupBakerySettings } from '@/server/repositories/bakery-settings';

export const instant = false;

function localTime(value: Date | string, timezone: string): string {
  const dateTime =
    value instanceof Date
      ? DateTime.fromJSDate(value, { zone: 'utc' })
      : DateTime.fromISO(value, { zone: 'utc' });

  return dateTime
    .setZone(timezone)
    .setLocale('sr-Latn')
    .toFormat('dd. LLLL yyyy. HH:mm');
}

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);

  if (!order) notFound();
  const settings = await getPickupBakerySettings();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted text-sm font-medium">Porudžbina</p>
          <h1 className="text-foreground mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Porudžbina {order.orderNumber}
          </h1>
          <p className="text-muted mt-2 text-sm">
            Kreirana {localTime(order.createdAt, settings.timezone)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <dl
        aria-label="Pregled porudžbine"
        className="border-border bg-border grid gap-px overflow-hidden rounded-xl border shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <SummaryItem label="Kupac" value={order.customerName} />
        <SummaryItem label="Telefon" value={order.customerPhone} />
        <SummaryItem
          label="Preuzimanje"
          value={localTime(order.pickupAt, settings.timezone)}
        />
        <SummaryItem
          label="Ukupno"
          value={formatRsd(order.totalMinor)}
          strong
        />
      </dl>

      <section className="border-border bg-surface overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border border-b px-5 py-4 sm:px-6">
          <h2 className="text-foreground text-xl font-semibold">
            Detalji porudžbine
          </h2>
          <p className="text-muted mt-1 text-sm">
            Cene i nazivi sačuvani u trenutku poručivanja.
          </p>
        </div>

        <div className="hidden grid-cols-[minmax(0,1fr)_9rem_6rem_9rem] gap-4 bg-stone-50 px-6 py-3 text-sm font-semibold text-stone-600 sm:grid">
          <span>Proizvod</span>
          <span className="text-right">Jedinična cena</span>
          <span className="text-right">Količina</span>
          <span className="text-right">Ukupno</span>
        </div>
        <ul className="divide-border divide-y">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_6rem_9rem] sm:items-center sm:gap-4 sm:px-6"
            >
              <p className="font-semibold">{item.productName}</p>
              <ItemValue
                label="Jedinična cena"
                value={formatRsd(item.unitPriceMinor)}
              />
              <ItemValue label="Količina" value={String(item.quantity)} />
              <ItemValue
                label="Ukupno"
                value={formatRsd(item.subtotalMinor)}
                strong
              />
            </li>
          ))}
        </ul>
        <div className="border-border bg-surface-muted flex items-center justify-between border-t px-5 py-4 sm:px-6">
          <span className="font-semibold">Ukupno porudžbine</span>
          <span className="text-lg font-bold tabular-nums">
            {formatRsd(order.totalMinor)}
          </span>
        </div>
      </section>

      {order.note ? (
        <section className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Napomena kupca</h2>
          <p className="mt-3 whitespace-pre-wrap text-stone-700">
            {order.note}
          </p>
        </section>
      ) : null}

      <OrderStatusActions id={order.id} status={order.status} />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="bg-surface p-5">
      <dt className="text-muted text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd
        className={`mt-2 break-words ${strong ? 'text-lg font-bold tabular-nums' : 'font-medium'}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ItemValue({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
      <span className="text-muted text-sm sm:hidden">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-bold' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

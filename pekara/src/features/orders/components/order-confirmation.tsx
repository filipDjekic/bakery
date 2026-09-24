import Link from 'next/link';
import { DateTime } from 'luxon';

import { formatRsd } from '@/lib/money';
import type { PublicOrderConfirmation } from '@/server/queries/order-confirmation';

import { CopyOrderNumber } from './copy-order-number';

const statusLabels: Record<PublicOrderConfirmation['status'], string> = {
  NEW: 'Primljena',
  ACCEPTED: 'Prihvaćena',
  IN_PREPARATION: 'U pripremi',
  READY: 'Spremna za preuzimanje',
  COMPLETED: 'Preuzeta',
  CANCELLED: 'Otkazana',
};

type OrderConfirmationProps = {
  order: PublicOrderConfirmation;
};

export function OrderConfirmation({ order }: OrderConfirmationProps) {
  const pickupDate = DateTime.fromISO(order.pickupAt, { zone: 'utc' })
    .setZone(order.bakery.timezone)
    .setLocale('sr-Latn');

  return (
    <article className="mx-auto max-w-3xl">
      <div className="border-border bg-surface rounded-2xl border p-6 text-center sm:p-10">
        <p className="text-primary text-sm font-semibold tracking-wider uppercase">
          Porudžbina je primljena
        </p>
        <h1 className="text-foreground mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Hvala na porudžbini
        </h1>
        <p className="text-muted mt-4 leading-7">
          Sačuvajte broj porudžbine i pokažite ga prilikom preuzimanja.
        </p>

        <div className="bg-surface-muted border-border mt-7 rounded-xl border px-4 py-6">
          <p className="text-muted text-sm">Broj porudžbine</p>
          <p className="text-foreground mt-2 text-3xl font-extrabold tracking-wider break-all sm:text-4xl">
            {order.orderNumber}
          </p>
          <CopyOrderNumber orderNumber={order.orderNumber} />
        </div>

        {order.status === 'CANCELLED' ? (
          <p className="mt-6 rounded-md bg-red-50 px-4 py-3 font-semibold text-red-800">
            Ova porudžbina je otkazana. Kontaktirajte pekaru ako imate pitanja.
          </p>
        ) : null}
      </div>

      <div className="border-border bg-surface mt-6 rounded-2xl border p-6 sm:p-8">
        <h2 className="text-foreground text-xl font-semibold">
          Detalji preuzimanja
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-muted text-sm">Termin</dt>
            <dd className="text-foreground mt-1 font-semibold">
              {pickupDate.toFormat('dd. LLLL yyyy. HH:mm')}
            </dd>
          </div>
          <div>
            <dt className="text-muted text-sm">Status</dt>
            <dd className="text-foreground mt-1 font-semibold">
              {statusLabels[order.status]}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted text-sm">Preuzimanje</dt>
            <dd className="text-foreground mt-1 font-semibold">
              {order.bakery.name}, {order.bakery.address}
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-border bg-surface mt-6 rounded-2xl border p-6 sm:p-8">
        <h2 className="text-foreground text-xl font-semibold">Proizvodi</h2>
        <ul className="mt-5 space-y-4">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="border-border flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-muted mt-1 text-sm tabular-nums">
                  {item.quantity} × {formatRsd(item.unitPriceMinor)}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">
                {formatRsd(item.subtotalMinor)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-border mt-6 flex items-center justify-between gap-4 border-t pt-5">
          <span className="font-semibold">Ukupno</span>
          <span className="text-xl font-bold tabular-nums">
            {formatRsd(order.totalMinor)}
          </span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-muted text-sm">
          Pitanja?{' '}
          <a
            href={`tel:${order.bakery.phone}`}
            className="text-primary font-semibold underline-offset-4 hover:underline"
          >
            {order.bakery.phone}
          </a>
        </p>
        <Link
          href="/proizvodi"
          className="bg-primary hover:bg-primary-hover focus-visible:ring-primary mt-6 inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Nazad na proizvode
        </Link>
      </div>
    </article>
  );
}

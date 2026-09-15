import Link from 'next/link';

import { formatRsd } from '@/lib/money';

import { ClearCartDialog } from './clear-cart-dialog';

type CartSummaryProps = {
  totalMinor: number;
  itemCount: number;
};

export function CartSummary({ totalMinor, itemCount }: CartSummaryProps) {
  return (
    <aside className="border-border bg-surface rounded-xl border p-5 lg:sticky lg:top-6 lg:p-6">
      <h2 className="text-foreground text-xl font-semibold">Pregled korpe</h2>

      <dl className="mt-6 space-y-4">
        <div className="text-muted flex items-center justify-between gap-4 text-sm">
          <dt>Ukupno artikala</dt>
          <dd className="text-foreground font-medium tabular-nums">
            {itemCount}
          </dd>
        </div>
        <div className="border-border flex items-center justify-between gap-4 border-t pt-4">
          <dt className="text-foreground font-semibold">
            Trenutni ukupni iznos
          </dt>
          <dd className="text-foreground text-xl font-bold">
            {formatRsd(totalMinor)}
          </dd>
        </div>
      </dl>

      <p className="text-muted mt-4 text-sm leading-6">
        Konačnu cenu i dostupnost proizvoda potvrđuje pekara prilikom slanja
        porudžbine.
      </p>

      <Link
        href="/checkout"
        className="bg-primary hover:bg-primary-hover focus-visible:ring-primary mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 py-3 text-base font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Nastavi na poručivanje
      </Link>

      <ClearCartDialog />
    </aside>
  );
}

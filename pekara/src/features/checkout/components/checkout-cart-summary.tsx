import { formatRsd } from '@/lib/money';

import type { CartItem } from '../../cart/types';

type CheckoutCartSummaryProps = {
  items: CartItem[];
};

export function CheckoutCartSummary({ items }: CheckoutCartSummaryProps) {
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const totalMinor = items.reduce(
    (total, item) => total + item.displayPriceMinor * item.quantity,
    0,
  );

  return (
    <aside className="border-border bg-surface rounded-xl border p-5 lg:sticky lg:top-6 lg:p-6">
      <h2 className="text-foreground text-xl font-semibold">Pregled korpe</h2>

      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li
            key={item.productId}
            className="border-border flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-foreground font-medium break-words">
                {item.name}
              </p>
              <p className="text-muted mt-1 text-sm tabular-nums">
                {item.quantity} × {formatRsd(item.displayPriceMinor)}
              </p>
            </div>
            <p className="text-foreground shrink-0 font-semibold tabular-nums">
              {formatRsd(item.quantity * item.displayPriceMinor)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="border-border mt-6 space-y-3 border-t pt-5">
        <div className="text-muted flex justify-between gap-4 text-sm">
          <dt>Ukupno artikala</dt>
          <dd className="text-foreground font-medium tabular-nums">
            {itemCount}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-foreground font-semibold">Trenutni iznos</dt>
          <dd className="text-foreground text-xl font-bold tabular-nums">
            {formatRsd(totalMinor)}
          </dd>
        </div>
      </dl>

      <p className="text-muted mt-4 text-sm leading-6">
        Cena i dostupnost biće ponovo proverene pre kreiranja porudžbine.
      </p>
    </aside>
  );
}

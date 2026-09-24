import { formatRsd } from '@/lib/money';
import {
  getCartItemCount,
  getCartTotalMinor,
} from '@/features/cart/lib/cart-totals';

import type { CartItem } from '../../cart/types';

type CheckoutCartSummaryProps = {
  items: CartItem[];
  collapsible?: boolean;
};

export function CheckoutCartSummary({
  items,
  collapsible = false,
}: CheckoutCartSummaryProps) {
  const itemCount = getCartItemCount(items);
  const totalMinor = getCartTotalMinor(items);

  const content = (
    <>
      {!collapsible ? (
        <h2 className="text-foreground text-xl font-bold">
          3. Pregled porudžbine
        </h2>
      ) : null}

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
    </>
  );

  if (collapsible) {
    return (
      <details className="border-border bg-surface rounded-2xl border shadow-sm">
        <summary className="focus-visible:ring-primary flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 font-bold focus-visible:ring-2 focus-visible:outline-none">
          <span>3. Pregled porudžbine</span>
          <span className="text-primary text-sm">
            {itemCount} artikala · {formatRsd(totalMinor)}
          </span>
        </summary>
        <div className="border-border border-t px-5 pb-5">{content}</div>
      </details>
    );
  }

  return (
    <aside className="border-border bg-surface rounded-2xl border p-5 shadow-sm lg:sticky lg:top-24 lg:p-6">
      {content}
    </aside>
  );
}

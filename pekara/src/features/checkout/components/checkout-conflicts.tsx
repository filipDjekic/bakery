'use client';

import { formatRsd } from '@/lib/money';
import type { OrderConflictDetails, OrderErrorCode } from '@/types/order';

type Props = {
  code: OrderErrorCode;
  details: OrderConflictDetails;
  cartNames: Map<string, string>;
  onAcceptPrice: (productId: string, priceMinor: number) => void;
  onRemove: (productId: string) => void;
};

export function CheckoutConflicts({
  code,
  details,
  cartNames,
  onAcceptPrice,
  onRemove,
}: Props) {
  return (
    <section
      aria-labelledby="checkout-conflict-heading"
      className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4"
    >
      <h2 id="checkout-conflict-heading" className="font-bold text-red-900">
        {code === 'PRICE_CHANGED'
          ? 'Cena je promenjena'
          : 'Proizvod više nije dostupan'}
      </h2>
      <ul className="mt-3 space-y-3">
        {details.items.map((item) => {
          const name =
            item.productName ?? cartNames.get(item.productId) ?? 'Proizvod';
          return (
            <li key={item.productId} className="rounded-lg bg-white p-3">
              <p className="font-semibold">{name}</p>
              {code === 'PRICE_CHANGED' &&
              item.previousPriceMinor !== undefined &&
              item.currentPriceMinor !== undefined ? (
                <p className="text-muted mt-1 text-sm">
                  <span className="line-through">
                    {formatRsd(item.previousPriceMinor)}
                  </span>{' '}
                  →{' '}
                  <strong className="text-primary">
                    {formatRsd(item.currentPriceMinor)}
                  </strong>
                </p>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  code === 'PRICE_CHANGED' &&
                  item.currentPriceMinor !== undefined
                    ? onAcceptPrice(item.productId, item.currentPriceMinor)
                    : onRemove(item.productId)
                }
                className="focus-visible:ring-primary mt-3 min-h-11 rounded-lg border border-red-700 px-4 text-sm font-bold text-red-800 focus-visible:ring-2 focus-visible:outline-none"
              >
                {code === 'PRICE_CHANGED'
                  ? 'Prihvati novu cenu'
                  : 'Ukloni iz korpe'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

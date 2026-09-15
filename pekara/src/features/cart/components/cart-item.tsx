import Image from 'next/image';

import { ProductImagePlaceholder } from '@/features/catalog/components/product-image-placeholder';
import { formatRsd } from '@/lib/money';

import type { CartItem as CartItemModel } from '../types';
import { CartQuantityControls } from './cart-quantity-controls';

type CartItemProps = {
  item: CartItemModel;
};

export function CartItem({ item }: CartItemProps) {
  const subtotalMinor = item.displayPriceMinor * item.quantity;

  return (
    <li className="border-border bg-surface grid grid-cols-[5rem_minmax(0,1fr)] gap-4 rounded-xl border p-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-5">
      <div className="bg-surface-muted border-border relative aspect-square overflow-hidden rounded-lg border">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 639px) 80px, 112px"
            className="object-cover"
          />
        ) : (
          <ProductImagePlaceholder productName={item.name} />
        )}
      </div>

      <div className="min-w-0">
        <h2 className="text-foreground text-base font-semibold break-words sm:text-lg">
          {item.name}
        </h2>
        <dl className="text-muted mt-2 space-y-1 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt>Trenutna jedinična cena:</dt>
            <dd>{formatRsd(item.displayPriceMinor)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt>Količina:</dt>
            <dd className="tabular-nums">{item.quantity}</dd>
          </div>
        </dl>

        <CartQuantityControls
          productId={item.productId}
          productName={item.name}
          quantity={item.quantity}
        />
      </div>

      <div className="col-span-2 flex items-center justify-between border-t border-zinc-100 pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
        <span className="text-muted text-sm sm:block">Međuzbir</span>
        <span className="text-foreground font-bold sm:mt-1 sm:block">
          {formatRsd(subtotalMinor)}
        </span>
      </div>
    </li>
  );
}

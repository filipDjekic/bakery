import { getOrderStatusMeta } from '@/config/order-status';
import type { PublicOrderStatus } from '@/types/order';

export function OrderStatusBadge({ status }: { status: PublicOrderStatus }) {
  const meta = getOrderStatusMeta(status);

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${meta.badgeClassName}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${meta.dotClassName}`}
      />
      {meta.label}
    </span>
  );
}

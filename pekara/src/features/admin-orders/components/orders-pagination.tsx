import Link from 'next/link';

import type { AdminOrdersResult } from '@/server/queries/admin-orders';

type OrdersPaginationProps = {
  pagination: AdminOrdersResult['pagination'];
  filters: AdminOrdersResult['filters'];
};

function pageHref(page: number, filters: AdminOrdersResult['filters']): string {
  const search = new URLSearchParams();
  search.set('page', String(page));

  if (filters.status) search.set('status', filters.status);
  if (filters.from) search.set('from', filters.from);
  if (filters.to) search.set('to', filters.to);

  return `/admin/orders?${search.toString()}`;
}

export function OrdersPagination({
  pagination,
  filters,
}: OrdersPaginationProps) {
  if (pagination.totalPages <= 1) {
    return (
      <p className="text-muted mt-4 text-sm">
        Ukupno porudžbina: {pagination.totalItems}
      </p>
    );
  }

  return (
    <nav
      aria-label="Stranice porudžbina"
      className="mt-5 flex items-center justify-between gap-4"
    >
      {pagination.page > 1 ? (
        <Link
          href={pageHref(pagination.page - 1, filters)}
          className="border-border bg-surface hover:bg-surface-muted rounded-md border px-4 py-2 text-sm font-semibold"
        >
          Prethodna
        </Link>
      ) : (
        <span />
      )}
      <p className="text-muted text-sm">
        Strana {pagination.page} od {pagination.totalPages} ·{' '}
        {pagination.totalItems} ukupno
      </p>
      {pagination.page < pagination.totalPages ? (
        <Link
          href={pageHref(pagination.page + 1, filters)}
          className="border-border bg-surface hover:bg-surface-muted rounded-md border px-4 py-2 text-sm font-semibold"
        >
          Sledeća
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

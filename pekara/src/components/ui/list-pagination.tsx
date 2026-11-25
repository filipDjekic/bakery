import Link from 'next/link';
import { buttonVariants } from './button';
import type { paginationFor } from '@/lib/list-query';
export function ListPagination({
  pagination,
  pathname,
  filters = {},
}: {
  pagination: ReturnType<typeof paginationFor>;
  pathname: string;
  filters?: Record<string, string | undefined>;
}) {
  const href = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value) query.set(key, value);
    query.set('page', String(page));
    return `${pathname}?${query}`;
  };
  return (
    <nav
      aria-label="Stranice rezultata"
      className="mt-5 flex flex-wrap items-center justify-between gap-3"
    >
      {pagination.page > 1 ? (
        <Link
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          href={href(pagination.page - 1)}
        >
          Prethodna
        </Link>
      ) : (
        <span />
      )}
      <p className="text-muted text-sm" role="status">
        Strana {pagination.page} od {pagination.totalPages} ·{' '}
        {pagination.totalItems} ukupno
      </p>
      {pagination.page < pagination.totalPages ? (
        <Link
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          href={href(pagination.page + 1)}
        >
          Sledeća
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

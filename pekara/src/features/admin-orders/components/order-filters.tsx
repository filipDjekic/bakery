import Link from 'next/link';

import type { AdminOrdersResult } from '@/server/queries/admin-orders';

type OrderFiltersProps = {
  filters: AdminOrdersResult['filters'];
};

export function OrderFilters({ filters }: OrderFiltersProps) {
  return (
    <form
      method="get"
      className="border-border bg-surface grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end"
    >
      <input type="hidden" name="view" value="all" />
      <div>
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={filters.status ?? ''}
          className="border-border bg-surface mt-2 min-h-10 w-full rounded-md border px-3"
        >
          <option value="">Svi statusi</option>
          <option value="NEW">Nove</option>
          <option value="ACCEPTED">Prihvaćene</option>
          <option value="IN_PREPARATION">U pripremi</option>
          <option value="READY">Spremne</option>
          <option value="COMPLETED">Završene</option>
          <option value="CANCELLED">Otkazane</option>
        </select>
      </div>
      <div>
        <label htmlFor="from" className="text-sm font-medium">
          Od datuma
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={filters.from ?? ''}
          className="border-border bg-surface mt-2 min-h-10 w-full rounded-md border px-3"
        />
      </div>
      <div>
        <label htmlFor="to" className="text-sm font-medium">
          Do datuma
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={filters.to ?? ''}
          className="border-border bg-surface mt-2 min-h-10 w-full rounded-md border px-3"
        />
      </div>
      <button
        type="submit"
        className="bg-primary hover:bg-primary-hover min-h-10 rounded-md px-4 py-2 font-semibold text-white"
      >
        Primeni
      </button>
      <Link
        href="/admin/orders?view=all"
        className="border-border hover:bg-surface-muted inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 font-semibold"
      >
        Resetuj
      </Link>
    </form>
  );
}

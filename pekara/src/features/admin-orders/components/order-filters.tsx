import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import { cardVariants } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import type { AdminOrdersResult } from '@/server/queries/admin-orders';

type OrderFiltersProps = {
  filters: AdminOrdersResult['filters'];
};

export function OrderFilters({ filters }: OrderFiltersProps) {
  return (
    <form
      method="get"
      className={cardVariants({
        className:
          'grid gap-4 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end',
      })}
    >
      <input type="hidden" name="view" value="all" />
      <div>
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <Select
          id="status"
          name="status"
          defaultValue={filters.status ?? ''}
          className="mt-2 min-h-10"
        >
          <option value="">Svi statusi</option>
          <option value="NEW">Nove</option>
          <option value="ACCEPTED">Prihvaćene</option>
          <option value="IN_PREPARATION">U pripremi</option>
          <option value="READY">Spremne</option>
          <option value="COMPLETED">Završene</option>
          <option value="CANCELLED">Otkazane</option>
        </Select>
      </div>
      <div>
        <label htmlFor="from" className="text-sm font-medium">
          Od datuma
        </label>
        <Input
          id="from"
          name="from"
          type="date"
          defaultValue={filters.from ?? ''}
          className="mt-2 min-h-10"
        />
      </div>
      <div>
        <label htmlFor="to" className="text-sm font-medium">
          Do datuma
        </label>
        <Input
          id="to"
          name="to"
          type="date"
          defaultValue={filters.to ?? ''}
          className="mt-2 min-h-10"
        />
      </div>
      <Button type="submit" size="sm">
        Primeni
      </Button>
      <Link
        href="/admin/orders?view=all"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Resetuj
      </Link>
    </form>
  );
}

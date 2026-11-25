import { ListPagination } from '@/components/ui/list-pagination';
import type { AdminOrdersResult } from '@/server/queries/admin-orders';
export function OrdersPagination({
  pagination,
  filters,
}: Pick<AdminOrdersResult, 'pagination' | 'filters'>) {
  return (
    <ListPagination
      pathname="/admin/orders"
      pagination={pagination}
      filters={{ ...filters, view: 'all' }}
    />
  );
}

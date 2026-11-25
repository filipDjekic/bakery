import { ListFilters } from '@/components/ui/list-filters';
import { ORDER_STATUS_META } from '@/config/order-status';
import type { AdminOrdersResult } from '@/server/queries/admin-orders';
export function OrderFilters({
  filters,
}: {
  filters: AdminOrdersResult['filters'];
}) {
  return (
    <ListFilters
      key={JSON.stringify(filters)}
      searchLabel="Broj porudžbine"
      fields={[
        {
          name: 'status',
          label: 'Status',
          options: Object.entries(ORDER_STATUS_META).map(([value, meta]) => ({
            value,
            label: meta.label,
          })),
        },
        { name: 'from', label: 'Od datuma', type: 'date' },
        { name: 'to', label: 'Do datuma', type: 'date' },
      ]}
    />
  );
}

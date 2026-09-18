import { OrderFilters } from '@/features/admin-orders/components/order-filters';
import { OrdersPagination } from '@/features/admin-orders/components/orders-pagination';
import { OrdersTable } from '@/features/admin-orders/components/orders-table';
import { getAdminOrders } from '@/server/queries/admin-orders';

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const instant = false;

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const params = await searchParams;
  const result = await getAdminOrders({
    page: first(params.page),
    status: first(params.status),
    from: first(params.from),
    to: first(params.to),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-foreground text-2xl font-bold">Sve porudžbine</h1>
        <p className="text-muted mt-1 text-sm">
          Najnovije porudžbine su prikazane prve.
        </p>
      </div>
      <OrderFilters filters={result.filters} />
      <div className="mt-6">
        <OrdersTable orders={result.orders} timezone={result.timezone} />
        <OrdersPagination
          pagination={result.pagination}
          filters={result.filters}
        />
      </div>
    </div>
  );
}

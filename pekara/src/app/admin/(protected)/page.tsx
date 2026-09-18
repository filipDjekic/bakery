import Link from 'next/link';
import { connection } from 'next/server';

import { ManualRefreshButton } from '@/features/admin-orders/components/manual-refresh-button';
import { OrderPolling } from '@/features/admin-orders/components/order-polling';
import { OrderStatusCards } from '@/features/admin-orders/components/order-status-cards';
import { RecentNewOrders } from '@/features/admin-orders/components/recent-new-orders';
import { getAdminDashboard } from '@/server/queries/admin-dashboard';

export default async function AdminHomePage() {
  await connection();
  const dashboard = await getAdminDashboard();

  return (
    <div className="space-y-6">
      <OrderPolling />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            Pregled porudžbina
          </h1>
          <p className="text-muted mt-1 text-sm">
            Podaci se osvežavaju svakih 15 sekundi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="bg-primary hover:bg-primary-hover min-h-10 rounded-md px-4 py-2 text-sm font-semibold text-white"
          >
            Sve porudžbine
          </Link>
          <ManualRefreshButton />
        </div>
      </div>
      <OrderStatusCards counts={dashboard.counts} />
      <RecentNewOrders
        orders={dashboard.recentNewOrders}
        timezone={dashboard.timezone}
      />
    </div>
  );
}

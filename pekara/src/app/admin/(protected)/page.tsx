import Link from 'next/link';
import { connection } from 'next/server';

import { OrderPolling } from '@/features/admin-orders/components/order-polling';
import { OrderStatusCards } from '@/features/admin-orders/components/order-status-cards';
import { ActiveOrderQueue } from '@/features/admin-orders/components/active-order-queue';
import { getActiveAdminOrders } from '@/server/queries/admin-orders';
import { firstParam, type SearchParams } from '@/lib/list-query';
import { RevenueCard } from '@/features/admin-orders/components/revenue-card';
import { getAdminDashboard } from '@/server/queries/admin-dashboard';

export const instant = false;

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const [dashboard, active] = await Promise.all([
    getAdminDashboard(),
    getActiveAdminOrders(
      undefined,
      Number(firstParam((await searchParams).page) ?? 1),
    ),
  ]);
  const nowIso = new Date().toISOString();

  return (
    <div className="space-y-6">
      <OrderPolling refreshedAt={nowIso} timezone={dashboard.timezone} />
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
        </div>
      </div>
      <OrderStatusCards counts={dashboard.counts} />
      <RevenueCard revenueMinor={dashboard.todayRevenueMinor} />
      <ActiveOrderQueue {...active} nowIso={nowIso} pathname="/admin" />
    </div>
  );
}

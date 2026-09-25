import 'server-only';

import { DateTime } from 'luxon';

import { db } from '../../prisma/db.ts';
import { requireStaff } from '../auth/authorization.ts';
import { getPickupBakerySettings } from '../repositories/bakery-settings.ts';

const RECENT_NEW_ORDER_LIMIT = 8;

type StaffAuthorizer = () => Promise<unknown>;

export type AdminDashboardData = {
  counts: {
    NEW: number;
    ACCEPTED: number;
    IN_PREPARATION: number;
    READY: number;
    todayCompleted: number;
  };
  todayRevenueMinor: number;
  recentNewOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    pickupAt: string;
    totalMinor: number;
    currencyCode: string;
    createdAt: string;
  }>;
  timezone: string;
};

type AdminDashboardOptions = {
  now?: DateTime;
  authorize?: StaffAuthorizer;
};

async function countByStatus(
  status: 'NEW' | 'ACCEPTED' | 'IN_PREPARATION' | 'READY',
) {
  return db.orm.public.Order.where({ status }).aggregate((aggregate) => ({
    count: aggregate.count(),
  }));
}

export async function getAdminDashboard({
  now = DateTime.utc(),
  authorize = requireStaff,
}: AdminDashboardOptions = {}): Promise<AdminDashboardData> {
  await authorize();

  const settings = await getPickupBakerySettings();
  const localToday = now.setZone(settings.timezone).startOf('day');

  if (!localToday.isValid) {
    throw new Error('Bakery timezone is invalid.');
  }

  const todayStart = localToday.toUTC().toISO();
  const tomorrowStart = localToday.plus({ days: 1 }).toUTC().toISO();

  if (!todayStart || !tomorrowStart) {
    throw new Error('Could not calculate the bakery-local day.');
  }

  const [
    newCount,
    acceptedCount,
    preparationCount,
    readyCount,
    completed,
    recent,
  ] = await Promise.all([
    countByStatus('NEW'),
    countByStatus('ACCEPTED'),
    countByStatus('IN_PREPARATION'),
    countByStatus('READY'),
    db.orm.public.Order.where({ status: 'COMPLETED' })
      .where((order) => order.updatedAt.gte(todayStart))
      .where((order) => order.updatedAt.lt(tomorrowStart))
      .aggregate((aggregate) => ({ 
        count: aggregate.count(), 
        revenueMinor: aggregate.sum('totalMinor') })),
    db.orm.public.Order.select(
      'id',
      'orderNumber',
      'customerName',
      'pickupAt',
      'totalMinor',
      'currencyCode',
      'createdAt',
    )
      .where({ status: 'NEW' })
      .orderBy([(order) => order.createdAt.desc(), (order) => order.id.desc()])
      .limit(RECENT_NEW_ORDER_LIMIT)
      .all(),
  ]);

  return {
    counts: {
      NEW: newCount.count,
      ACCEPTED: acceptedCount.count,
      IN_PREPARATION: preparationCount.count,
      READY: readyCount.count,
      todayCompleted: completed.count,
    },
    todayRevenueMinor: completed.revenueMinor ?? 0,
    recentNewOrders: recent.map((order) => ({
      ...order,
      pickupAt: new Date(order.pickupAt).toISOString(),
      createdAt: new Date(order.createdAt).toISOString(),
    })),
    timezone: settings.timezone,
  };
}

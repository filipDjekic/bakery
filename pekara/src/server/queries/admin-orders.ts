import 'server-only';

import { DateTime } from 'luxon';
import { z } from 'zod';

import { ACTIVE_ORDER_STATUSES } from '../../config/order-status.ts';
import { db } from '../../prisma/db.ts';
import type { PublicOrderStatus } from '../../types/order.ts';
import { requireStaff } from '../auth/authorization.ts';
import { getPickupBakerySettings } from '../repositories/bakery-settings.ts';

export const ADMIN_ORDERS_PAGE_SIZE = 25;
export const ACTIVE_ADMIN_ORDERS_LIMIT = 100;
const ADMIN_ORDERS_MAX_PAGE = 100_000;

const filterSchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .positive()
      .max(ADMIN_ORDERS_MAX_PAGE)
      .catch(1),
    status: z
      .enum([
        'NEW',
        'ACCEPTED',
        'IN_PREPARATION',
        'READY',
        'COMPLETED',
        'CANCELLED',
      ])
      .optional()
      .catch(undefined),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .catch(undefined),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .catch(undefined),
  })
  .transform((filters) => ({
    ...filters,
    from:
      filters.from && filters.to && filters.from > filters.to
        ? filters.to
        : filters.from,
    to:
      filters.from && filters.to && filters.from > filters.to
        ? filters.from
        : filters.to,
  }));

export type AdminOrderFiltersInput = {
  page?: string | number;
  status?: string;
  from?: string;
  to?: string;
};

export type AdminOrdersResult = {
  orders: Array<{
    id: string;
    orderNumber: string;
    status: PublicOrderStatus;
    customerName: string;
    pickupAt: string;
    totalMinor: number;
    currencyCode: string;
    createdAt: string;
  }>;
  filters: {
    status?: PublicOrderStatus;
    from?: string;
    to?: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  timezone: string;
};

export type ActiveAdminOrdersResult = {
  orders: AdminOrdersResult['orders'];
  timezone: string;
};

type StaffAuthorizer = () => Promise<unknown>;

function addFilters<T extends ReturnType<typeof baseOrderQuery>>(
  query: T,
  status: PublicOrderStatus | undefined,
  fromInstant: string | undefined,
  toInstant: string | undefined,
) {
  let filtered = query;

  if (status) {
    filtered = filtered.where({ status }) as T;
  }

  if (fromInstant) {
    filtered = filtered.where((order) => order.createdAt.gte(fromInstant)) as T;
  }

  if (toInstant) {
    filtered = filtered.where((order) => order.createdAt.lt(toInstant)) as T;
  }

  return filtered;
}

function baseOrderQuery() {
  return db.orm.public.Order;
}

export async function getAdminOrders(
  input: AdminOrderFiltersInput,
  authorize: StaffAuthorizer = requireStaff,
): Promise<AdminOrdersResult> {
  await authorize();

  const parsed = filterSchema.parse(input);
  const settings = await getPickupBakerySettings();
  const fromDate = parsed.from
    ? DateTime.fromISO(parsed.from, { zone: settings.timezone })
    : null;
  const toDate = parsed.to
    ? DateTime.fromISO(parsed.to, { zone: settings.timezone }).plus({ days: 1 })
    : null;
  const validFrom = fromDate?.isValid ? fromDate.toUTC().toISO() : undefined;
  const validTo = toDate?.isValid ? toDate.toUTC().toISO() : undefined;
  const normalizedFrom = validFrom ? parsed.from : undefined;
  const normalizedTo = validTo ? parsed.to : undefined;
  const filteredOrders = addFilters(
    baseOrderQuery(),
    parsed.status,
    validFrom ?? undefined,
    validTo ?? undefined,
  );
  const count = await filteredOrders.aggregate((aggregate) => ({
    count: aggregate.count(),
  }));
  const totalPages = Math.max(
    1,
    Math.ceil(count.count / ADMIN_ORDERS_PAGE_SIZE),
  );
  const page = Math.min(parsed.page, totalPages);
  const rows = await filteredOrders
    .select(
      'id',
      'orderNumber',
      'status',
      'customerName',
      'pickupAt',
      'totalMinor',
      'currencyCode',
      'createdAt',
    )
    .orderBy([(order) => order.createdAt.desc(), (order) => order.id.desc()])
    .offset((page - 1) * ADMIN_ORDERS_PAGE_SIZE)
    .limit(ADMIN_ORDERS_PAGE_SIZE)
    .all();

  return {
    orders: rows.map((order) => ({
      ...order,
      pickupAt: new Date(order.pickupAt).toISOString(),
      createdAt: new Date(order.createdAt).toISOString(),
    })),
    filters: {
      status: parsed.status,
      from: normalizedFrom,
      to: normalizedTo,
    },
    pagination: {
      page,
      pageSize: ADMIN_ORDERS_PAGE_SIZE,
      totalItems: count.count,
      totalPages,
    },
    timezone: settings.timezone,
  };
}

export async function getActiveAdminOrders(
  authorize: StaffAuthorizer = requireStaff,
): Promise<ActiveAdminOrdersResult> {
  await authorize();
  const settings = await getPickupBakerySettings();
  const rows = await db.orm.public.Order.select(
    'id',
    'orderNumber',
    'status',
    'customerName',
    'pickupAt',
    'totalMinor',
    'currencyCode',
    'createdAt',
  )
    .where((order) => order.status.in([...ACTIVE_ORDER_STATUSES]))
    .orderBy([
      (order) => order.pickupAt.asc(),
      (order) => order.createdAt.asc(),
      (order) => order.id.asc(),
    ])
    .limit(ACTIVE_ADMIN_ORDERS_LIMIT)
    .all();

  return {
    orders: rows.map((order) => ({
      ...order,
      pickupAt: new Date(order.pickupAt).toISOString(),
      createdAt: new Date(order.createdAt).toISOString(),
    })),
    timezone: settings.timezone,
  };
}

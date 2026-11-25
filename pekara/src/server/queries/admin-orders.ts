import { containsPattern, searchText } from '../../lib/list-query.ts';
import 'server-only';

import { DateTime } from 'luxon';
import { z } from 'zod';

import { ACTIVE_ORDER_STATUSES } from '../../config/order-status.ts';
import { db } from '../../prisma/db.ts';
import type { PublicOrderStatus } from '../../types/order.ts';
import { requireStaff } from '../auth/authorization.ts';
import { getPickupBakerySettings } from '../repositories/bakery-settings.ts';

export const ADMIN_ORDERS_PAGE_SIZE = 25;
export const ACTIVE_ADMIN_ORDERS_LIMIT = 10;
const ADMIN_ORDERS_MAX_PAGE = 100_000;

const filterSchema = z
  .object({
    q: z.preprocess(searchText, z.string()),
    page: z.coerce
      .number()
      .int()
      .positive()
      .catch(1)
      .transform((value) => Math.min(value, ADMIN_ORDERS_MAX_PAGE)),
    status: z
      .enum([
        'NEW',
        'ACCEPTED',
        'IN_PREPARATION',
        'READY',
        'LATE',
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
  q?: string;
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
    originalTotalMinor?: number | null;
    discountMinor?: number;
    currencyCode: string;
    createdAt: string;
  }>;
  filters: {
    q?: string;
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
  page?: number;
  totalItems?: number;
  totalPages?: number;
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
  let filteredOrders = addFilters(
    baseOrderQuery(),
    parsed.status,
    validFrom ?? undefined,
    validTo ?? undefined,
  );
  if (parsed.q)
    filteredOrders = filteredOrders.where((order) =>
      order.orderNumber.ilike(containsPattern(parsed.q)),
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
      'originalTotalMinor',
      'discountMinor',
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
      q: parsed.q,
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
  requestedPage = 1,
): Promise<ActiveAdminOrdersResult> {
  await authorize();
  const settings = await getPickupBakerySettings();
  const count = await db.orm.public.Order.where((order) =>
    order.status.in([...ACTIVE_ORDER_STATUSES]),
  ).aggregate((a) => ({ count: a.count() }));
  const totalPages = Math.max(
    1,
    Math.ceil(count.count / ACTIVE_ADMIN_ORDERS_LIMIT),
  );
  const page = Math.min(
    totalPages,
    Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1),
  );
  const rows = await db.orm.public.Order.select(
    'id',
    'orderNumber',
    'status',
    'customerName',
    'pickupAt',
    'totalMinor',
    'originalTotalMinor',
    'discountMinor',
    'currencyCode',
    'createdAt',
  )
    .where((order) => order.status.in([...ACTIVE_ORDER_STATUSES]))
    .orderBy([
      (order) => order.pickupAt.asc(),
      (order) => order.createdAt.asc(),
      (order) => order.id.asc(),
    ])
    .offset((page - 1) * ACTIVE_ADMIN_ORDERS_LIMIT)
    .limit(ACTIVE_ADMIN_ORDERS_LIMIT)
    .all();

  return {
    orders: rows.map((order) => ({
      ...order,
      pickupAt: new Date(order.pickupAt).toISOString(),
      createdAt: new Date(order.createdAt).toISOString(),
    })),
    timezone: settings.timezone,
    page,
    totalItems: count.count,
    totalPages,
  };
}

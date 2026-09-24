// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AdminOrdersResult } from '@/server/queries/admin-orders';

import { ActiveOrderQueue } from './active-order-queue';
import { OrderMobileCards } from './order-mobile-cards';
import { OrdersHistory } from './orders-history';

const nowIso = '2026-09-24T10:00:00.000Z';
const order: AdminOrdersResult['orders'][number] = {
  id: 'order-1',
  orderNumber: 'PK-1048',
  status: 'IN_PREPARATION',
  customerName: 'Marko Marković sa veoma dugačkim prezimenom',
  pickupAt: '2026-09-24T10:12:00.000Z',
  totalMinor: 124000,
  currencyCode: 'RSD',
  createdAt: '2026-09-24T09:42:00.000Z',
};

describe('admin order history views', () => {
  it('renders mobile card data and a semantic detail link', () => {
    render(
      <OrderMobileCards
        orders={[order]}
        timezone="Europe/Belgrade"
        nowIso={nowIso}
      />,
    );
    const list = screen.getByRole('list', { name: 'Porudžbine' });
    expect(
      within(list).getByRole('heading', { name: 'PK-1048' }),
    ).toBeInTheDocument();
    expect(within(list).getByText(/Marko Marković/)).toBeInTheDocument();
    expect(within(list).getByText('U pripremi')).toBeInTheDocument();
    expect(within(list).getByText('1.240,00 RSD')).toBeInTheDocument();
    expect(within(list).getByText('Za 12 min')).toBeInTheDocument();
    expect(
      within(list).getByRole('link', { name: /Otvori porudžbinu PK-1048/ }),
    ).toHaveAttribute('href', '/admin/orders/order-1');
  });

  it('keeps the desktop history table and provides filter reset when empty', () => {
    const result: AdminOrdersResult = {
      orders: [order],
      filters: {},
      pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
      timezone: 'Europe/Belgrade',
    };
    const { rerender } = render(
      <OrdersHistory result={result} nowIso={nowIso} />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();

    rerender(
      <OrdersHistory
        result={{
          ...result,
          orders: [],
          pagination: { ...result.pagination, totalItems: 0 },
        }}
        nowIso={nowIso}
      />,
    );
    expect(screen.getByText(/Nema porudžbina/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Obriši filtere' }),
    ).toHaveAttribute('href', '/admin/orders?view=all');
  });
});

describe('active order queue', () => {
  it('shows operational priority data, overdue text and detail links', () => {
    render(
      <ActiveOrderQueue
        orders={[
          { ...order, id: 'late', pickupAt: '2026-09-24T09:52:00.000Z' },
          order,
        ]}
        timezone="Europe/Belgrade"
        nowIso={nowIso}
      />,
    );
    expect(screen.getByText('Kasni 8 min')).toBeInTheDocument();
    expect(screen.getByText('Za 12 min')).toBeInTheDocument();
    expect(screen.getAllByText('PK-1048')).toHaveLength(2);
    expect(
      screen.getAllByRole('link', { name: /Otvori porudžbinu/ }),
    ).toHaveLength(2);
  });

  it('has a useful empty state with a history link', () => {
    render(
      <ActiveOrderQueue
        orders={[]}
        timezone="Europe/Belgrade"
        nowIso={nowIso}
      />,
    );
    expect(screen.getByText('Nema aktivnih porudžbina.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Pogledaj sve porudžbine' }),
    ).toHaveAttribute('href', '/admin/orders?view=all');
  });
});

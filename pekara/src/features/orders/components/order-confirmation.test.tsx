// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { PublicOrderConfirmation } from '@/server/queries/order-confirmation';
import { OrderConfirmation } from './order-confirmation';
it('renders truthful next steps for all six statuses without customer contact data', () => {
  const titles = {
    NEW: 'Hvala na porudžbini',
    ACCEPTED: 'Porudžbina je prihvaćena',
    IN_PREPARATION: 'Vaša porudžbina se priprema',
    READY: 'Vaša porudžbina je spremna',
    COMPLETED: 'Hvala na poseti',
    CANCELLED: 'Porudžbina je otkazana',
  };
  for (const [status, title] of Object.entries(titles)) {
    const order: PublicOrderConfirmation = {
      orderId: 'test',
      orderNumber: 'PK-TEST',
      status: status as PublicOrderConfirmation['status'],
      pickupAt: '2026-11-24T12:00:00Z',
      totalMinor: 12500,
      currencyCode: 'RSD',
      items: [],
      bakery: {
        name: 'Test pekara',
        phone: '+381111234567',
        address: 'Test adresa',
        timezone: 'Europe/Belgrade',
      },
    };
    render(<OrderConfirmation order={order} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    expect(
      screen.getByText(/Status možete ponovo proveriti/),
    ).toBeInTheDocument();
    if (status === 'CANCELLED' || status === 'COMPLETED')
      expect(
        screen.queryByText('Porudžbina je primljena'),
      ).not.toBeInTheDocument();
    cleanup();
  }
});

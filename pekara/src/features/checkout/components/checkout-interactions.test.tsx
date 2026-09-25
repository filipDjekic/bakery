// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { PickupAvailability } from '@/server/services/pickup-slots';

import { CheckoutConflicts } from './checkout-conflicts';
import { PickupSelector } from './pickup-selector';

const availability: PickupAvailability = {
  dates: [
    { date: '2026-09-24', label: 'Danas', shortDateLabel: '24. sep' },
    { date: '2026-09-25', label: 'Sutra', shortDateLabel: '25. sep' },
  ],
  earliestSlot: {
    date: '2026-09-24',
    dateLabel: 'Danas',
    label: '10:30',
    value: '2026-09-24T08:30:00.000Z',
  },
  bakeryTimezone: 'Europe/Belgrade',
  orderAcceptingEnabled: true,
};

const registration = {
  name: 'pickupDate' as const,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
};

describe('pickup selection', () => {
  it('renders server-provided date and time chips and preserves exact ISO values', async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    const onTimeChange = vi.fn();
    render(
      <PickupSelector
        availability={availability}
        dateRegistration={registration}
        timeRegistration={{ ...registration, name: 'pickupAt' }}
        slots={[
          { label: '10:30', value: '2026-09-24T08:30:00.000Z' },
          { label: '11:00', value: '2026-09-24T09:00:00.000Z' },
        ]}
        selectedDate="2026-09-24"
        selectedTime=""
        isLoading={false}
        loadError={null}
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
      />,
    );

    expect(screen.getByText('Danas u 10:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Danas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: /Sutra/ }));
    expect(onDateChange).toHaveBeenCalledWith('2026-09-25');
    await user.click(screen.getByRole('button', { name: '11:00' }));
    expect(onTimeChange).toHaveBeenCalledWith('2026-09-24T09:00:00.000Z');
  });

  it('announces loading, exposes retry and handles a date without slots', async () => {
    const user = userEvent.setup();
    const baseProps = {
      availability,
      dateRegistration: registration,
      timeRegistration: { ...registration, name: 'pickupAt' as const },
      slots: [],
      selectedDate: '2026-09-24',
      selectedTime: '',
      onDateChange: vi.fn(),
      onTimeChange: vi.fn(),
    };
    const { rerender } = render(
      <PickupSelector {...baseProps} isLoading loadError={null} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Učitavanje termina/);

    rerender(
      <PickupSelector
        {...baseProps}
        isLoading={false}
        loadError="Termini nisu dostupni."
      />,
    );
    expect(screen.getByText('Termini nisu dostupni.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }));
    expect(baseProps.onDateChange).toHaveBeenCalledWith('2026-09-24');

    rerender(
      <PickupSelector {...baseProps} isLoading={false} loadError={null} />,
    );
    expect(
      screen.getByText('Nema dostupnih termina za izabrani datum.'),
    ).toBeInTheDocument();
  });
});

describe('checkout conflicts', () => {
  it('shows changed prices and requires an explicit acceptance action', async () => {
    const user = userEvent.setup();
    const onAcceptPrice = vi.fn();
    render(
      <CheckoutConflicts
        code="PRICE_CHANGED"
        details={{
          items: [
            {
              productId: 'product-1',
              productName: 'Kroasan',
              previousPriceMinor: 15000,
              currentPriceMinor: 17000,
            },
          ],
        }}
        cartNames={new Map()}
        onAcceptPrice={onAcceptPrice}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText('Kroasan')).toBeInTheDocument();
    expect(screen.getByText('150,00 RSD')).toBeInTheDocument();
    expect(screen.getByText('170,00 RSD')).toBeInTheDocument();
    expect(onAcceptPrice).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: 'Prihvati novu cenu' }),
    );
    expect(onAcceptPrice).toHaveBeenCalledWith('product-1', 17000);
  });

  it('removes only the unavailable product selected by the customer', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <CheckoutConflicts
        code="PRODUCT_UNAVAILABLE"
        details={{ items: [{ productId: 'product-2', productName: null }] }}
        cartNames={new Map([['product-2', 'Pogačica']])}
        onAcceptPrice={vi.fn()}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('Pogačica')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ukloni iz korpe' }));
    expect(onRemove).toHaveBeenCalledWith('product-2');
  });
});

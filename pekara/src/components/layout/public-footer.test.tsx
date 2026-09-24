// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/queries/public-settings', () => ({
  getPublicChromeSettings: vi.fn(async () => ({
    bakeryName: 'Test pekara',
    address: 'Glavna 1, Beograd',
    phone: '+381111234567',
    timezone: 'Europe/Belgrade',
    todayHoursLabel: '08:00–16:00',
    isOpen: true,
    businessHours: [
      { weekday: 1, openMinute: 480, closeMinute: 960 },
      { weekday: 6, openMinute: 540, closeMinute: 780 },
    ],
  })),
}));

import { PublicFooter } from './public-footer';

describe('public footer', () => {
  it('links phone and address and exposes today and full weekly hours', async () => {
    render(await PublicFooter());

    expect(screen.getByRole('link', { name: '+381111234567' })).toHaveAttribute(
      'href',
      'tel:+381111234567',
    );
    expect(
      screen.getByRole('link', { name: 'Glavna 1, Beograd' }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/search'),
    );
    expect(screen.getByText('Danas: 08:00–16:00')).toBeInTheDocument();
    expect(screen.getByText('Pogledaj radno vreme')).toBeInTheDocument();
    expect(screen.getByText('Ponedeljak')).toBeInTheDocument();
    expect(screen.getAllByText('Zatvoreno')).toHaveLength(5);
  });
});

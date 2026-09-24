import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import {
  formatCreatedAge,
  formatPickupCountdown,
  formatPickupDayTime,
} from './order-time';

const now = DateTime.fromISO('2026-09-24T10:00:00.000Z');

describe('admin order time formatting', () => {
  it('formats upcoming and overdue pickup countdowns deterministically', () => {
    expect(formatPickupCountdown('2026-09-24T10:12:00.000Z', now)).toBe(
      'Za 12 min',
    );
    expect(formatPickupCountdown('2026-09-24T09:52:00.000Z', now)).toBe(
      'Kasni 8 min',
    );
    expect(formatPickupCountdown('2026-09-24T11:05:00.000Z', now)).toBe(
      'Za 1 h 5 min',
    );
  });

  it('uses bakery timezone for the pickup day and formats created age', () => {
    expect(
      formatPickupDayTime('2026-09-24T22:30:00.000Z', 'Europe/Belgrade', now),
    ).toEqual({ time: '00:30', label: 'Sutra u 00:30' });
    expect(formatCreatedAge('2026-09-24T09:42:00.000Z', now)).toBe(
      'Kreirana pre 18 min',
    );
  });
});

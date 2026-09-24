import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { calculateCurrentBusinessState } from './business-state';

const zone = 'Europe/Belgrade';
const monday = (hour: number, minute = 0) =>
  DateTime.fromObject(
    { year: 2026, month: 9, day: 21, hour, minute },
    { zone },
  );
const hours = (weekday: number, openMinute: number, closeMinute: number) => ({
  weekday,
  openMinute,
  closeMinute,
});

describe('current bakery business state', () => {
  it('returns the close of the currently active interval', () => {
    const state = calculateCurrentBusinessState({
      timezone: zone,
      now: monday(10),
      businessHours: [hours(1, 360, 1200)],
    });
    expect(state.isOpen).toBe(true);
    expect(state.closesAtLabel).toBe('20:00');
    expect(state.opensAtNext).toBeNull();
  });

  it('finds opening today before work and between split shifts', () => {
    const schedule = [hours(1, 360, 720), hours(1, 840, 1200)];
    expect(
      calculateCurrentBusinessState({
        timezone: zone,
        now: monday(5),
        businessHours: schedule,
      }).opensAtNextLabel,
    ).toBe('danas u 06:00');
    expect(
      calculateCurrentBusinessState({
        timezone: zone,
        now: monday(13),
        businessHours: schedule,
      }).opensAtNextLabel,
    ).toBe('danas u 14:00');
  });

  it('skips closed days and wraps from Sunday to Monday', () => {
    const mondayOnly = [hours(1, 360, 720)];
    expect(
      calculateCurrentBusinessState({
        timezone: zone,
        now: monday(21),
        businessHours: [hours(2, 420, 900)],
      }).opensAtNextLabel,
    ).toBe('sutra u 07:00');
    const sunday = DateTime.fromISO('2026-09-27T20:00:00', { zone });
    expect(
      calculateCurrentBusinessState({
        timezone: zone,
        now: sunday,
        businessHours: mondayOnly,
      }).opensAtNextLabel,
    ).toBe('sutra u 06:00');
  });

  it('returns a safe null when the whole week is closed', () => {
    const state = calculateCurrentBusinessState({
      timezone: zone,
      now: monday(12),
      businessHours: [],
    });
    expect(state.isOpen).toBe(false);
    expect(state.opensAtNext).toBeNull();
  });

  it('uses bakery timezone when UTC and local dates differ', () => {
    const state = calculateCurrentBusinessState({
      timezone: zone,
      now: DateTime.fromISO('2026-09-20T22:30:00Z'),
      businessHours: [hours(1, 30, 120)],
    });
    expect(state.isOpen).toBe(true);
    expect(state.closesAtLabel).toBe('02:00');
  });
});

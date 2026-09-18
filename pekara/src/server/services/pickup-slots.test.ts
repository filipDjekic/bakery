import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';

import { DateTime } from 'luxon';

import type { PickupBakerySettings } from '../repositories/bakery-settings.ts';
import type { PickupBusinessHours } from '../repositories/business-hours.ts';
import { generatePickupSlots } from './pickup-slots.ts';

const settings: PickupBakerySettings = {
  id: 'default',
  timezone: 'Europe/Belgrade',
  currencyCode: 'RSD',
  orderAcceptingEnabled: true,
  minimumPreparationMinutes: 30,
  maximumAdvanceDays: 7,
  pickupSlotMinutes: 30,
};

function hours(
  weekday: number,
  openMinute: number,
  closeMinute: number,
): PickupBusinessHours {
  return { weekday, openMinute, closeMinute };
}

afterEach(() => {
  vi.useRealTimers();
});

test('uses the fake system clock deterministically when now is omitted', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-14T07:00:00.000Z'));

  const slots = generatePickupSlots({
    date: '2026-09-14',
    settings,
    businessHours: [hours(1, 480, 600)],
  });

  assert.equal(slots[0]?.value, '2026-09-14T07:30:00.000Z');
});

test('generates only prepared future slots across split intervals', () => {
  const slots = generatePickupSlots({
    date: '2026-09-14',
    settings,
    businessHours: [hours(1, 480, 600), hours(1, 720, 780)],
    now: DateTime.fromISO('2026-09-14T07:00:00Z'),
  });

  assert.deepEqual(
    slots.map((slot) => slot.label),
    ['09:30', '12:00', '12:30'],
  );
  assert.deepEqual(
    slots.map((slot) => slot.value),
    [
      '2026-09-14T07:30:00.000Z',
      '2026-09-14T10:00:00.000Z',
      '2026-09-14T10:30:00.000Z',
    ],
  );
});

test('returns no slots for a closed day, disabled ordering or date outside range', () => {
  const now = DateTime.fromISO('2026-09-14T08:00:00Z');

  assert.deepEqual(
    generatePickupSlots({
      date: '2026-09-15',
      settings,
      businessHours: [],
      now,
    }),
    [],
  );
  assert.deepEqual(
    generatePickupSlots({
      date: '2026-09-14',
      settings: { ...settings, orderAcceptingEnabled: false },
      businessHours: [hours(1, 0, 1440)],
      now,
    }),
    [],
  );
  assert.deepEqual(
    generatePickupSlots({
      date: '2026-09-22',
      settings,
      businessHours: [hours(2, 480, 600)],
      now,
    }),
    [],
  );
});

test('returns no slot when minimum preparation reaches closing time', () => {
  assert.deepEqual(
    generatePickupSlots({
      date: '2026-09-14',
      settings,
      businessHours: [hours(1, 1080, 1200)],
      now: DateTime.fromISO('2026-09-14T17:40:00Z'),
    }),
    [],
  );
});

test('skips nonexistent local times when DST starts', () => {
  const slots = generatePickupSlots({
    date: '2026-03-29',
    settings: { ...settings, minimumPreparationMinutes: 0 },
    businessHours: [hours(7, 60, 240)],
    now: DateTime.fromISO('2026-03-28T00:00:00Z'),
  });

  assert.deepEqual(
    slots.map((slot) => slot.label),
    ['01:00', '01:30', '03:00', '03:30'],
  );
});

test('keeps both distinct instants for ambiguous local times when DST ends', () => {
  const slots = generatePickupSlots({
    date: '2026-10-25',
    settings: { ...settings, minimumPreparationMinutes: 0 },
    businessHours: [hours(7, 60, 240)],
    now: DateTime.fromISO('2026-10-24T00:00:00Z'),
  });
  const ambiguousSlots = slots.filter((slot) => slot.label === '02:30');

  assert.equal(slots.length, 8);
  assert.deepEqual(
    ambiguousSlots.map((slot) => slot.value),
    ['2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z'],
  );
});

test('rejects invalid timezone, settings and business-hour intervals', () => {
  const now = DateTime.fromISO('2026-09-14T08:00:00Z');

  assert.throws(() =>
    generatePickupSlots({
      date: '2026-09-14',
      settings: { ...settings, timezone: 'UTC+1' },
      businessHours: [],
      now,
    }),
  );
  assert.throws(() =>
    generatePickupSlots({
      date: '2026-09-14',
      settings: { ...settings, pickupSlotMinutes: 0 },
      businessHours: [],
      now,
    }),
  );
  assert.throws(() =>
    generatePickupSlots({
      date: '2026-09-14',
      settings,
      businessHours: [hours(1, 600, 600)],
      now,
    }),
  );
});

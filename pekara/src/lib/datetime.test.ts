import { describe, it, expect } from 'vitest';
import { Settings } from 'luxon';
import { businessIntervalsOnDate } from './datetime';
import { DateTime } from 'luxon';
import {
  businessDayUtcBounds,
  formatDateTime,
  formatDate,
  formatTime,
  minutesToTimeString,
  timeStringToMinutes,
  parseLocalDateTime,
  toUtcInstant,
  toUtcIso,
} from './datetime';
describe.each(['Europe/Belgrade', 'UTC', 'America/New_York', 'Asia/Tokyo'])(
  'business time with host zone %s',
  (zone) => {
    it('roundtrips winter and summer wall times independently of the host zone', () => {
      const previous = Settings.defaultZone;
      try {
        Settings.defaultZone = zone;
        expect(toUtcIso(parseLocalDateTime('2026-11-25', '14:30'))).toBe(
          '2026-11-25T13:30:00.000Z',
        );
        expect(toUtcIso(parseLocalDateTime('2026-07-25', '14:30'))).toBe(
          '2026-07-25T12:30:00.000Z',
        );
        expect(formatDateTime('2026-11-25T13:30:00Z')).toBe(
          '25.11.2026. 14:30',
        );
        expect(formatDate('2026-11-25T13:30:00Z')).toBe('25.11.2026.');
        expect(formatTime('2026-11-25T13:30:00Z')).toBe('14:30');
        expect(toUtcInstant('2026-11-25T14:30:00+01:00')).toBe(
          '2026-11-25T13:30:00.000Z',
        );
      } finally {
        Settings.defaultZone = previous;
      }
    });
  },
);
it('rejects nonexistent/ambiguous wall times unless an explicit offset resolves the fold', () => {
  expect(() => parseLocalDateTime('2026-03-29', '02:30')).toThrow();
  expect(() => parseLocalDateTime('2026-10-25', '02:30')).toThrow();
  expect(
    toUtcIso(parseLocalDateTime('2026-10-25', '02:30', 'Europe/Belgrade', 120)),
  ).toBe('2026-10-25T00:30:00.000Z');
  expect(
    toUtcIso(parseLocalDateTime('2026-10-25', '02:30', 'Europe/Belgrade', 60)),
  ).toBe('2026-10-25T01:30:00.000Z');
  expect(() => parseLocalDateTime('2026-02-30', '12:00')).toThrow();
  expect(() => toUtcInstant('25.11.2026. 14:30')).toThrow();
});
it('uses 23 and 25 hour business days at DST boundaries', () => {
  for (const [day, hours] of [
    ['2026-03-29', 23],
    ['2026-10-25', 25],
  ] as const) {
    const bounds = businessDayUtcBounds(day);
    expect((Date.parse(bounds.end) - Date.parse(bounds.start)) / 3600000).toBe(
      hours,
    );
  }
});

it('keeps business opening intervals inside real DST wall times', () => {
  const spring = DateTime.fromISO('2026-03-29', { zone: 'Europe/Belgrade' });
  expect(businessIntervalsOnDate(spring, 150, 180)).toEqual([]);
  const autumn = DateTime.fromISO('2026-10-25', { zone: 'Europe/Belgrade' });
  const repeated = businessIntervalsOnDate(autumn, 120, 150);
  expect(
    repeated.map((range) => [toUtcIso(range.start), toUtcIso(range.end)]),
  ).toEqual([
    ['2026-10-25T00:00:00.000Z', '2026-10-25T00:30:00.000Z'],
    ['2026-10-25T01:00:00.000Z', '2026-10-25T01:30:00.000Z'],
  ]);
});
it('keeps calendar-independent local working hours and handles missing displays', () => {
  for (const minute of [0, 360, 870, 1439])
    expect(timeStringToMinutes(minutesToTimeString(minute))).toBe(minute);
  expect(minutesToTimeString(1440, true)).toBe('24:00');
  expect(timeStringToMinutes('24:00', true)).toBe(1440);
  for (const time of ['', '6:00', '24:00', '23:60', '09:aa'])
    expect(() => timeStringToMinutes(time)).toThrow();
  expect(formatDateTime(null)).toBe('—');
  expect(formatDateTime('bad')).toBe('—');
});

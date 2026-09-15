import { DateTime, IANAZone } from 'luxon';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertValidTimezone(timezone: string): void {
  if (!IANAZone.isValidZone(timezone)) {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }
}

export function parseLocalDate(date: string, timezone: string): DateTime {
  assertValidTimezone(timezone);

  if (!LOCAL_DATE_PATTERN.test(date)) {
    throw new Error(`Invalid local date: ${date}`);
  }

  const parsed = DateTime.fromISO(date, { zone: timezone });

  if (!parsed.isValid || parsed.toISODate() !== date) {
    throw new Error(`Invalid local date: ${date}`);
  }

  return parsed.startOf('day');
}

export function localDateAtMinute(
  date: DateTime,
  minuteOfDay: number,
): DateTime {
  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1440) {
    throw new Error(`Invalid minute of day: ${minuteOfDay}`);
  }

  if (minuteOfDay === 1440) {
    return date.plus({ days: 1 }).startOf('day');
  }

  return DateTime.fromObject(
    {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: Math.floor(minuteOfDay / 60),
      minute: minuteOfDay % 60,
    },
    { zone: date.zone },
  );
}

export function toUtcIso(dateTime: DateTime): string {
  const value = dateTime.toUTC().toISO({ suppressMilliseconds: false });

  if (!value) {
    throw new Error('Cannot serialize an invalid date-time.');
  }

  return value;
}

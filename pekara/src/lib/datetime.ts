import { DateTime, IANAZone } from 'luxon';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatCalendarDate(
  value: string,
  timezone = DEFAULT_TIMEZONE,
): string {
  return parseLocalDate(value, timezone)
    .setLocale(DATE_LOCALE)
    .toFormat('dd.MM.yyyy.');
}

/** Local intervals can have gaps/repeated portions on DST transition days. */
export function businessIntervalsOnDate(
  date: DateTime,
  openMinute: number,
  closeMinute: number,
): Array<{ start: DateTime; end: DateTime }> {
  minutesToTimeString(openMinute);
  minutesToTimeString(closeMinute, true);
  if (openMinute >= closeMinute)
    throw new Error('Invalid working-hours interval');
  const start = date.startOf('day');
  const end = start.plus({ days: 1 });
  if (end.diff(start, 'hours').hours === 24)
    return [
      {
        start: localDateAtMinute(start, openMinute),
        end: localDateAtMinute(start, closeMinute),
      },
    ];
  const intervals: Array<{ start: DateTime; end: DateTime }> = [];
  for (
    let instant = start;
    instant < end;
    instant = instant.plus({ minutes: 1 })
  ) {
    const minute = instant.hour * 60 + instant.minute;
    if (minute < openMinute || minute >= closeMinute) continue;
    const previous = intervals.at(-1);
    const next = instant.plus({ minutes: 1 });
    if (previous?.end.toMillis() === instant.toMillis()) previous.end = next;
    else intervals.push({ start: instant, end: next });
  }
  return intervals;
}
export const DEFAULT_TIMEZONE = 'Europe/Belgrade';
export const DATE_LOCALE = 'sr-Latn-RS';

/** Only offset-bearing ISO timestamps are instants. Local dates/times use separate parsers. */
export function toBakeryLocalTime(
  value: string | Date,
  timezone = DEFAULT_TIMEZONE,
): DateTime {
  assertValidTimezone(timezone);
  const instant =
    value instanceof Date
      ? DateTime.fromJSDate(value, { zone: 'utc' })
      : /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
        ? DateTime.fromISO(value, { setZone: true })
        : DateTime.invalid('An explicit UTC offset is required');
  return instant.setZone(timezone).setLocale(DATE_LOCALE);
}

function format(
  value: string | Date | null | undefined,
  pattern: string,
  timezone: string,
): string {
  if (!value) return '—';
  const local = toBakeryLocalTime(value, timezone);
  return local.isValid ? local.toFormat(pattern) : '—';
}
export const formatDate = (
  value: string | Date | null | undefined,
  timezone = DEFAULT_TIMEZONE,
) => format(value, 'dd.MM.yyyy.', timezone);
export const formatTime = (
  value: string | Date | null | undefined,
  timezone = DEFAULT_TIMEZONE,
) => format(value, 'HH:mm', timezone);
export const formatDateTime = (
  value: string | Date | null | undefined,
  timezone = DEFAULT_TIMEZONE,
) => format(value, 'dd.MM.yyyy. HH:mm', timezone);
export const isValidDateTime = (value: string) =>
  toBakeryLocalTime(value).isValid;
export function toUtcInstant(value: string | Date): string {
  return toUtcIso(toBakeryLocalTime(value, 'UTC'));
}

export function minutesToTimeString(
  minutes: number,
  allowEndOfDay = false,
): string {
  if (
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > (allowEndOfDay ? 1440 : 1439)
  )
    throw new Error('Neispravno lokalno vreme.');
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function timeStringToMinutes(
  value: string,
  allowEndOfDay = false,
): number {
  if (allowEndOfDay && value === '24:00') return 1440;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new Error('Unesite vreme u formatu HH:mm.');
  const [hours, minutes] = value.split(':').map(Number);
  return hours! * 60 + minutes!;
}

/** Reject DST gaps; ambiguous wall times require an explicit offset selection. */
export function parseLocalDateTime(
  date: string,
  time: string,
  timezone = DEFAULT_TIMEZONE,
  offsetMinutes?: number,
): DateTime {
  const day = parseLocalDate(date, timezone);
  const minute = timeStringToMinutes(time);
  const local = localDateAtMinute(day, minute);
  if (local.toISODate() !== date || local.hour * 60 + local.minute !== minute)
    throw new Error(
      'Vreme ne postoji zbog prelaska na letnje računanje vremena.',
    );
  const candidates = local.getPossibleOffsets();
  if (candidates.length > 1) {
    const selected = candidates.find(
      (candidate) => candidate.offset === offsetMinutes,
    );
    if (!selected) throw new Error('Izaberite UTC pomak za dvosmisleno vreme.');
    return selected;
  }
  return local;
}

export function businessDayUtcBounds(
  date: string,
  timezone = DEFAULT_TIMEZONE,
) {
  const start = parseLocalDate(date, timezone);
  return { start: toUtcIso(start), end: toUtcIso(start.plus({ days: 1 })) };
}

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

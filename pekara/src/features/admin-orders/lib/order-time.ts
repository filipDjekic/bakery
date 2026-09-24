import { DateTime } from 'luxon';

export function formatAdminOrderTime(value: string, timezone: string): string {
  return DateTime.fromISO(value, { zone: 'utc' })
    .setZone(timezone)
    .setLocale('sr-Latn')
    .toFormat('dd. LLL yyyy. HH:mm');
}

export function formatPickupDayTime(
  value: string,
  timezone: string,
  now: DateTime,
): { time: string; label: string } {
  const pickup = DateTime.fromISO(value, { zone: 'utc' }).setZone(timezone);
  const localNow = now.setZone(timezone);
  const day = pickup.hasSame(localNow, 'day')
    ? 'Danas'
    : pickup.hasSame(localNow.plus({ days: 1 }), 'day')
      ? 'Sutra'
      : pickup.setLocale('sr-Latn').toFormat('dd. LLL');
  return {
    time: pickup.toFormat('HH:mm'),
    label: `${day} u ${pickup.toFormat('HH:mm')}`,
  };
}

function durationLabel(minutes: number): string {
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remaining = absolute % 60;
  if (hours === 0) return `${absolute} min`;
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`;
}

export function formatPickupCountdown(value: string, now: DateTime): string {
  const pickup = DateTime.fromISO(value, { zone: 'utc' });
  const minutes = Math.round(pickup.diff(now.toUTC(), 'minutes').minutes);
  if (minutes < 0) return `Kasni ${durationLabel(minutes)}`;
  if (minutes === 0) return 'Preuzimanje je sada';
  return `Za ${durationLabel(minutes)}`;
}

export function formatCreatedAge(value: string, now: DateTime): string {
  const created = DateTime.fromISO(value, { zone: 'utc' });
  const minutes = Math.max(
    0,
    Math.floor(now.toUTC().diff(created, 'minutes').minutes),
  );
  return `Kreirana pre ${durationLabel(minutes)}`;
}

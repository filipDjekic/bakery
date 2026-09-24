import { DateTime } from 'luxon';

import { localDateAtMinute } from './datetime';

export type WeeklyBusinessInterval = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
};

export type CurrentBusinessState = {
  isOpen: boolean;
  closesAt: string | null;
  closesAtLabel: string | null;
  opensAtNext: string | null;
  opensAtNextLabel: string | null;
};

export function calculateCurrentBusinessState({
  businessHours,
  timezone,
  now,
}: {
  businessHours: WeeklyBusinessInterval[];
  timezone: string;
  now: DateTime;
}): CurrentBusinessState {
  const localNow = now.setZone(timezone);
  if (!localNow.isValid) throw new Error('Bakery current time is invalid.');
  const minute = localNow.hour * 60 + localNow.minute;
  const today = businessHours
    .filter((hours) => hours.weekday === localNow.weekday)
    .sort((left, right) => left.openMinute - right.openMinute);
  const active = today.find(
    (hours) => minute >= hours.openMinute && minute < hours.closeMinute,
  );

  if (active) {
    const close = localDateAtMinute(
      localNow.startOf('day'),
      active.closeMinute,
    );
    return {
      isOpen: true,
      closesAt: close.toUTC().toISO(),
      closesAtLabel: close.toFormat('HH:mm'),
      opensAtNext: null,
      opensAtNextLabel: null,
    };
  }

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = localNow.startOf('day').plus({ days: offset });
    const intervals = businessHours
      .filter((hours) => hours.weekday === date.weekday)
      .sort((left, right) => left.openMinute - right.openMinute);
    for (const interval of intervals) {
      const opening = localDateAtMinute(date, interval.openMinute);
      if (opening <= localNow) continue;
      const dayLabel =
        offset === 0
          ? 'danas'
          : offset === 1
            ? 'sutra'
            : date.setLocale('sr-Latn').toFormat('cccc');
      return {
        isOpen: false,
        closesAt: null,
        closesAtLabel: null,
        opensAtNext: opening.toUTC().toISO(),
        opensAtNextLabel: `${dayLabel} u ${opening.toFormat('HH:mm')}`,
      };
    }
  }

  return {
    isOpen: false,
    closesAt: null,
    closesAtLabel: null,
    opensAtNext: null,
    opensAtNextLabel: null,
  };
}

import { DateTime } from 'luxon';

import { businessIntervalsOnDate, formatTime } from './datetime';

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
  const today = businessHours
    .filter((hours) => hours.weekday === localNow.weekday)
    .flatMap((hours) =>
      businessIntervalsOnDate(localNow, hours.openMinute, hours.closeMinute),
    );
  const active = today.find(
    (interval) => localNow >= interval.start && localNow < interval.end,
  );
  if (active) {
    const close = active.end;
    return {
      isOpen: true,
      closesAt: close.toUTC().toISO(),
      closesAtLabel: formatTime(close.toUTC().toISO()!, timezone),
      opensAtNext: null,
      opensAtNextLabel: null,
    };
  }

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = localNow.startOf('day').plus({ days: offset });
    const intervals = businessHours
      .filter((hours) => hours.weekday === date.weekday)
      .sort((left, right) => left.openMinute - right.openMinute);
    const openings = intervals
      .flatMap((interval) =>
        businessIntervalsOnDate(
          date,
          interval.openMinute,
          interval.closeMinute,
        ),
      )
      .sort((a, b) => a.start.toMillis() - b.start.toMillis());
    for (const interval of openings) {
      const opening = interval.start;
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
        opensAtNextLabel: `${dayLabel} u ${formatTime(opening.toUTC().toISO()!, timezone)}`,
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

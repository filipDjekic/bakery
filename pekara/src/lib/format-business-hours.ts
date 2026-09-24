function formatMinuteOfDay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours.toString().padStart(2, '0')}:${remainingMinutes
    .toString()
    .padStart(2, '0')}`;
}

type BusinessHoursInterval = {
  openMinute: number;
  closeMinute: number;
};

export function formatBusinessHours(
  intervals: BusinessHoursInterval[],
): string {
  if (intervals.length === 0) {
    return 'Danas zatvoreno';
  }

  return intervals
    .map(
      (interval) =>
        `${formatMinuteOfDay(interval.openMinute)}–${formatMinuteOfDay(
          interval.closeMinute,
        )}`,
    )
    .join(', ');
}

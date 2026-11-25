import { minutesToTimeString } from './datetime';

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
        `${minutesToTimeString(interval.openMinute)}–${minutesToTimeString(interval.closeMinute, true)}`,
    )
    .join(', ');
}

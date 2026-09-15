import { formatBusinessHours } from '@/lib/format-business-hours';
import type { HomepageBusinessHours } from '@/server/queries/home';

type TodaysHoursProps = {
  intervals: HomepageBusinessHours[];
};

export function TodaysHours({ intervals }: TodaysHoursProps) {
  const isClosed = intervals.length === 0;

  return (
    <p
      className={`mt-2 font-medium ${
        isClosed ? 'text-zinc-600' : 'text-zinc-950'
      }`}
    >
      {formatBusinessHours(intervals)}
    </p>
  );
}

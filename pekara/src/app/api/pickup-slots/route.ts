import { DateTime } from 'luxon';

import {
  getPickupSlotsForDate,
  type PickupSlot,
} from '../../../server/services/pickup-slots.ts';

type PickupSlotsResponse = {
  slots: PickupSlot[];
  bakeryTimezone: string;
};

type PickupSlotsLoader = (date: string) => Promise<PickupSlotsResponse>;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidLocalDate(value: string | null): value is string {
  if (!value || !LOCAL_DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = DateTime.fromISO(value, { zone: 'UTC' });
  return parsed.isValid && parsed.toISODate() === value;
}

export function createPickupSlotsGetHandler(
  loadPickupSlots: PickupSlotsLoader = getPickupSlotsForDate,
) {
  return async function GET(request: Request): Promise<Response> {
    const searchParams = new URL(request.url).searchParams;
    const dates = searchParams.getAll('date');

    if (dates.length !== 1 || !isValidLocalDate(dates[0] ?? null)) {
      return Response.json(
        {
          error: {
            code: 'INVALID_DATE',
            message: 'Query parameter date must be a valid YYYY-MM-DD date.',
          },
        },
        { status: 400 },
      );
    }

    const result = await loadPickupSlots(dates[0]);

    return Response.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  };
}

export const GET = createPickupSlotsGetHandler();

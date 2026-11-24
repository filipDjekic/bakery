import 'server-only';
import { AppError } from '../errors/app-error.ts';
import { mapErrorToResponse } from '../errors/http-error-mapper.ts';
import { requestIdFor } from '../logging/request-id.ts';
import {
  logEvent,
  errorCodeFor,
  OBSERVABILITY_EVENTS,
} from '../logging/events.ts';
import { reportUnexpectedError } from '../errors/sentry.ts';

import { DateTime } from 'luxon';

import {
  getPickupSlotsForDate,
  type PickupSlot,
} from '../services/pickup-slots.ts';

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
    const requestId = requestIdFor(request);
    try {
      const dates = new URL(request.url).searchParams.getAll('date');
      if (dates.length !== 1 || !isValidLocalDate(dates[0] ?? null))
        throw new AppError({ code: 'INVALID_DATE' });
      const result = await loadPickupSlots(dates[0]);
      return Response.json(result, {
        headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId },
      });
    } catch (error) {
      logEvent(
        {
          requestId,
          event: OBSERVABILITY_EVENTS.pickupSlotsFailed,
          route: '/api/pickup-slots',
          errorCode: errorCodeFor(error),
        },
        'error',
      );
      reportUnexpectedError(error, {
        requestId,
        route: '/api/pickup-slots',
        event: OBSERVABILITY_EVENTS.pickupSlotsFailed,
      });
      const response = mapErrorToResponse(error, requestId);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
  };
}

import 'server-only';

import type { OrderErrorCode, PublicErrorResponse } from '../../types/order.ts';
import { OrderRateLimitExceededError } from '../rate-limit/order-rate-limit.ts';
import { OrderDomainError } from '../services/create-order.ts';
import { IdempotencyConflictError } from '../services/idempotency.ts';

const ERROR_STATUS: Record<OrderErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PRODUCT_UNAVAILABLE: 409,
  PRICE_CHANGED: 409,
  INVALID_PICKUP_SLOT: 409,
  ORDERS_DISABLED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

const SAFE_MESSAGES: Record<OrderErrorCode, string> = {
  VALIDATION_ERROR: 'Podaci zahteva nisu validni.',
  NOT_FOUND: 'Traženi resurs ne postoji.',
  CONFLICT: 'Zahtev je u konfliktu sa trenutnim stanjem.',
  PRODUCT_UNAVAILABLE: 'Jedan ili više proizvoda više nisu dostupni.',
  PRICE_CHANGED: 'Cena jednog ili više proizvoda je promenjena.',
  INVALID_PICKUP_SLOT: 'Izabrani termin više nije dostupan.',
  ORDERS_DISABLED: 'Primanje porudžbina je trenutno isključeno.',
  IDEMPOTENCY_CONFLICT:
    'Isti ključ zahteva je već iskorišćen sa drugim podacima.',
  RATE_LIMITED: 'Previše pokušaja. Pokušajte ponovo kasnije.',
  INTERNAL_ERROR: 'Došlo je do interne greške. Pokušajte ponovo.',
};

export function createErrorResponse(
  code: OrderErrorCode,
  requestId: string,
  retryAfterSeconds?: number,
): Response {
  const body: PublicErrorResponse = {
    error: { code, message: SAFE_MESSAGES[code] },
    requestId,
  };
  const headers = new Headers();
  headers.set('X-Request-Id', requestId);

  if (retryAfterSeconds !== undefined) {
    headers.set('Retry-After', String(retryAfterSeconds));
  }

  return Response.json(body, { status: ERROR_STATUS[code], headers });
}

export function mapOrderErrorToResponse(
  error: unknown,
  requestId: string,
): Response {
  if (error instanceof OrderDomainError) {
    return createErrorResponse(error.code, requestId);
  }

  if (error instanceof IdempotencyConflictError) {
    return createErrorResponse('IDEMPOTENCY_CONFLICT', requestId);
  }

  if (error instanceof OrderRateLimitExceededError) {
    return createErrorResponse(
      'RATE_LIMITED',
      requestId,
      error.retryAfterSeconds,
    );
  }

  return createErrorResponse('INTERNAL_ERROR', requestId);
}

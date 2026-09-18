import 'server-only';

import type { OrderErrorCode } from '../../types/order.ts';
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
} from '../auth/authorization.ts';
import { OrderRateLimitExceededError } from '../rate-limit/order-rate-limit.ts';
import { OrderDomainError } from '../services/create-order.ts';
import { IdempotencyConflictError } from '../services/idempotency.ts';
import { AppError } from './app-error.ts';
import type { AppErrorCode } from './error-codes.ts';
import { normalizeAppError } from './safe-action-result.ts';

function knownHttpError(error: unknown): AppError | null {
  if (error instanceof OrderDomainError)
    return new AppError({ code: error.code as AppErrorCode, cause: error });
  if (error instanceof IdempotencyConflictError)
    return new AppError({ code: 'IDEMPOTENCY_CONFLICT', cause: error });
  if (error instanceof OrderRateLimitExceededError)
    return new AppError({
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: error.retryAfterSeconds },
      cause: error,
    });
  if (error instanceof AuthenticationRequiredError)
    return new AppError({ code: 'AUTHENTICATION_REQUIRED', cause: error });
  if (error instanceof AuthorizationDeniedError)
    return new AppError({ code: 'AUTHORIZATION_DENIED', cause: error });
  return null;
}

export function createAppErrorResponse(
  error: AppError,
  requestId: string,
): Response {
  const body = {
    error: {
      code: error.code,
      message: error.safeMessage,
      ...(error.details ? { details: error.details } : {}),
    },
    requestId,
  };
  const headers = new Headers({ 'X-Request-Id': requestId });
  const retryAfter = error.details?.retryAfterSeconds;
  if (typeof retryAfter === 'number')
    headers.set('Retry-After', String(retryAfter));
  return Response.json(body, { status: error.status, headers });
}

export function createErrorResponse(
  code: OrderErrorCode,
  requestId: string,
  retryAfterSeconds?: number,
): Response {
  return createAppErrorResponse(
    new AppError({
      code: code as AppErrorCode,
      ...(retryAfterSeconds === undefined
        ? {}
        : { details: { retryAfterSeconds } }),
    }),
    requestId,
  );
}

export function mapErrorToResponse(
  error: unknown,
  requestId: string,
): Response {
  return createAppErrorResponse(
    normalizeAppError(error, knownHttpError),
    requestId,
  );
}

export const mapOrderErrorToResponse = mapErrorToResponse;

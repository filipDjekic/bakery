import 'server-only';

import { AppError } from '../errors/app-error.ts';
import { safeError, safeInfo, type EventLogger } from './logger.ts';

export const OBSERVABILITY_EVENTS = {
  orderCreateSucceeded: 'order.create.succeeded',
  orderCreateFailed: 'order.create.failed',
  orderStatusChanged: 'order.status.changed',
  orderStatusChangeFailed: 'order.status.change_failed',
} as const;

export type ObservabilityEvent =
  (typeof OBSERVABILITY_EVENTS)[keyof typeof OBSERVABILITY_EVENTS];

export type EventFields = {
  requestId: string;
  event: ObservabilityEvent;
  route: string;
  orderId?: string;
  orderNumber?: string;
  userId?: string;
  durationMs?: number;
  errorCode?: string;
  outcome?: string;
};

export function errorCodeFor(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 429
  ) {
    return 'RATE_LIMITED';
  }
  if (error instanceof Error && error.name === 'IdempotencyConflictError') {
    return 'IDEMPOTENCY_CONFLICT';
  }
  return 'INTERNAL_ERROR';
}

export function logEvent(
  fields: EventFields,
  level: 'info' | 'error',
  logger?: EventLogger,
): void {
  if (level === 'error') safeError(fields, logger);
  else safeInfo(fields, logger);
}

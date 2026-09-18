import 'server-only';

import * as Sentry from '@sentry/nextjs';

import { AppError } from './app-error.ts';

type CaptureException = (
  error: unknown,
  captureContext?: Parameters<typeof Sentry.captureException>[1],
) => unknown;

export type ErrorReportingContext = {
  requestId?: string;
  route: string;
  event: string;
  orderId?: string;
  userId?: string;
};

export function isUnexpectedError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === 'INTERNAL_ERROR' || error.code === 'DATABASE_ERROR';
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return false;
  }

  return !(
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}

export function reportUnexpectedError(
  error: unknown,
  context: ErrorReportingContext,
  capture: CaptureException = Sentry.captureException,
): void {
  if (!isUnexpectedError(error)) return;

  try {
    capture(error, {
      tags: {
        event: context.event,
        route: context.route,
        ...(context.requestId ? { requestId: context.requestId } : {}),
      },
      contexts: {
        operation: {
          ...(context.orderId ? { orderId: context.orderId } : {}),
          ...(context.userId ? { userId: context.userId } : {}),
        },
      },
    });
  } catch {
    // Error reporting is best effort and must not affect the request.
  }
}

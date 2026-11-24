import 'server-only';
import { after } from 'next/server.js';
import { readBoundedJson } from './read-json.ts';
import { requestClientIp } from '../rate-limit/request-ip.ts';
import {
  consumeRateLimit,
  OrderRateLimitExceededError,
} from '../rate-limit/order-rate-limit.ts';

import { createCheckoutPayloadHash } from '../../lib/payload-hash.ts';
import { reportUnexpectedError } from '../errors/sentry.ts';
import { mapErrorToResponse } from '../errors/http-error-mapper.ts';
import {
  errorCodeFor,
  logEvent,
  OBSERVABILITY_EVENTS,
} from '../logging/events.ts';
import { requestIdFor } from '../logging/request-id.ts';
import { createClientFingerprint } from '../rate-limit/fingerprint.ts';
import { enforceOrderCreateRateLimit } from '../rate-limit/order-rate-limit.ts';
import {
  findOrderByIdempotencyKey,
  isIdempotencyKeyConflict,
} from '../repositories/orders.ts';
import { createOrder, OrderDomainError } from '../services/create-order.ts';
import { executeIdempotently } from '../services/idempotency.ts';
import type { OrderConfirmationDto } from '../../types/order.ts';
import { checkoutRequestSchema } from '../../validation/checkout.ts';

type OrdersPostDependencies = {
  enforceIngressRateLimit?: (request: Request) => Promise<void>;
  findExisting: typeof findOrderByIdempotencyKey;
  create: (
    input: unknown,
    payloadHash: string,
  ) => Promise<OrderConfirmationDto>;
  enforceRateLimit: (request: Request) => Promise<void>;
  isIdempotencyConflict: (error: unknown) => boolean;
};

async function enforceRequestRateLimit(request: Request): Promise<void> {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;

  if (!secret) {
    throw new Error('RATE_LIMIT_HMAC_SECRET is not configured.');
  }

  const clientIp = requestClientIp(request.headers);
  const fingerprint = createClientFingerprint(clientIp, secret);
  await enforceOrderCreateRateLimit(fingerprint);
}

async function enforceIngressRateLimit(request: Request): Promise<void> {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!secret) throw new Error('RATE_LIMIT_HMAC_SECRET is not configured.');
  const fingerprint = createClientFingerprint(
    requestClientIp(request.headers),
    secret,
  );
  const result = await consumeRateLimit('order:request', fingerprint, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!result.allowed)
    throw new OrderRateLimitExceededError(result.retryAfterSeconds);
}

const defaultDependencies: OrdersPostDependencies = {
  enforceIngressRateLimit,
  findExisting: findOrderByIdempotencyKey,
  create: (input, payloadHash) =>
    createOrder(input, { payloadHash, scheduleNotifications: after }),
  enforceRateLimit: enforceRequestRateLimit,
  isIdempotencyConflict: isIdempotencyKeyConflict,
};

export function createOrdersPostHandler(
  dependencies: OrdersPostDependencies = defaultDependencies,
) {
  return async function POST(request: Request): Promise<Response> {
    const requestId = requestIdFor(request);
    const startedAt = performance.now();

    function validationFailure(error: OrderDomainError): Response {
      logEvent(
        {
          requestId,
          event: OBSERVABILITY_EVENTS.orderCreateFailed,
          route: '/api/orders',
          durationMs: Math.round(performance.now() - startedAt),
          errorCode: error.code,
        },
        'error',
      );
      return mapErrorToResponse(error, requestId);
    }

    try {
      await dependencies.enforceIngressRateLimit?.(request);
      const body = await readBoundedJson(request);

      const parsed = checkoutRequestSchema.safeParse(body);

      if (!parsed.success) {
        return validationFailure(
          new OrderDomainError(
            'VALIDATION_ERROR',
            'Invalid request.',
            parsed.error.issues,
          ),
        );
      }

      const payloadHash = createCheckoutPayloadHash(parsed.data);
      const result = await executeIdempotently({
        idempotencyKey: parsed.data.idempotencyKey,
        payloadHash,
        findExisting: dependencies.findExisting,
        create: async () => {
          await dependencies.enforceRateLimit(request);
          return dependencies.create(parsed.data, payloadHash);
        },
        isUniqueConflict: dependencies.isIdempotencyConflict,
      });

      logEvent(
        {
          requestId,
          event: OBSERVABILITY_EVENTS.orderCreateSucceeded,
          route: '/api/orders',
          outcome: result.kind,
          orderId: result.value.orderId,
          orderNumber: result.value.orderNumber,
          durationMs: Math.round(performance.now() - startedAt),
        },
        'info',
      );

      return Response.json(result.value, {
        status: result.kind === 'created' ? 201 : 200,
        headers: { 'X-Request-Id': requestId },
      });
    } catch (error) {
      const errorCode = errorCodeFor(error);
      logEvent(
        {
          requestId,
          event: OBSERVABILITY_EVENTS.orderCreateFailed,
          route: '/api/orders',
          durationMs: Math.round(performance.now() - startedAt),
          errorCode,
        },
        'error',
      );
      reportUnexpectedError(error, {
        requestId,
        event: OBSERVABILITY_EVENTS.orderCreateFailed,
        route: '/api/orders',
      });

      const response = mapErrorToResponse(error, requestId);
      response.headers.set('X-Request-Id', requestId);
      return response;
    }
  };
}

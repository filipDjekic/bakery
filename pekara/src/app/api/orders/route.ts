import { createCheckoutPayloadHash } from '../../../lib/payload-hash.ts';
import { reportUnexpectedError } from '../../../server/errors/sentry.ts';
import { mapErrorToResponse } from '../../../server/errors/http-error-mapper.ts';
import {
  errorCodeFor,
  logEvent,
  OBSERVABILITY_EVENTS,
} from '../../../server/logging/events.ts';
import { requestIdFor } from '../../../server/logging/request-id.ts';
import {
  createClientFingerprint,
  getClientIpFromTrustedHeader,
} from '../../../server/rate-limit/fingerprint.ts';
import { enforceOrderCreateRateLimit } from '../../../server/rate-limit/order-rate-limit.ts';
import {
  findOrderByIdempotencyKey,
  isIdempotencyKeyConflict,
} from '../../../server/repositories/orders.ts';
import {
  createOrder,
  OrderDomainError,
} from '../../../server/services/create-order.ts';
import { executeIdempotently } from '../../../server/services/idempotency.ts';
import type { OrderConfirmationDto } from '../../../types/order.ts';
import { checkoutRequestSchema } from '../../../validation/checkout.ts';

type OrdersPostDependencies = {
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

  const clientIp = getClientIpFromTrustedHeader(request.headers);
  const fingerprint = createClientFingerprint(clientIp, secret);
  await enforceOrderCreateRateLimit(fingerprint);
}

const defaultDependencies: OrdersPostDependencies = {
  findExisting: findOrderByIdempotencyKey,
  create: (input, payloadHash) => createOrder(input, { payloadHash }),
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
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return validationFailure(
          new OrderDomainError('VALIDATION_ERROR', 'Malformed JSON.'),
        );
      }

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

export const POST = createOrdersPostHandler();

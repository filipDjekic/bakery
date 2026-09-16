import { randomUUID } from 'node:crypto';

import { createCheckoutPayloadHash } from '../../../lib/payload-hash.ts';
import { mapOrderErrorToResponse } from '../../../server/errors/http-error-mapper.ts';
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

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

function requestIdFor(request: Request): string {
  const supplied = request.headers.get('x-request-id');
  return supplied && REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : randomUUID();
}

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

    try {
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return mapOrderErrorToResponse(
          new OrderDomainError('VALIDATION_ERROR', 'Malformed JSON.'),
          requestId,
        );
      }

      const parsed = checkoutRequestSchema.safeParse(body);

      if (!parsed.success) {
        return mapOrderErrorToResponse(
          new OrderDomainError(
            'VALIDATION_ERROR',
            'Invalid request.',
            parsed.error.issues,
          ),
          requestId,
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

      console.info(
        JSON.stringify({
          level: 'info',
          event: 'public_order_request_completed',
          requestId,
          outcome: result.kind,
          orderId: result.value.orderId,
        }),
      );

      return Response.json(result.value, {
        status: result.kind === 'created' ? 201 : 200,
        headers: { 'X-Request-Id': requestId },
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'public_order_request_failed',
          requestId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        }),
      );

      const response = mapOrderErrorToResponse(error, requestId);
      response.headers.set('X-Request-Id', requestId);
      return response;
    }
  };
}

export const POST = createOrdersPostHandler();

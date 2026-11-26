import type {
  CreateOrderErrorResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from '../types';
import { z } from 'zod';

const confirmationSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string().min(1),
  status: z.enum([
    'NEW',
    'ACCEPTED',
    'IN_PREPARATION',
    'READY',
    'LATE',
    'COMPLETED',
    'CANCELLED',
  ]),
  pickupAt: z.iso.datetime({ offset: true }),
  totalMinor: z.number().int().nonnegative(),
  currencyCode: z.string().length(3),
});
const errorSchema = z.object({
  requestId: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .object({
        items: z.array(
          z.object({
            productId: z.string(),
            productName: z.string().nullable(),
            previousPriceMinor: z.number().int().nonnegative().optional(),
            currentPriceMinor: z.number().int().nonnegative().optional(),
          }),
        ),
      })
      .optional(),
  }),
});

export class CreateOrderApiError extends Error {
  readonly code: CreateOrderErrorResponse['error']['code'];
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
  readonly details?: CreateOrderErrorResponse['error']['details'];

  constructor(
    code: CreateOrderErrorResponse['error']['code'],
    message: string,
    requestId?: string,
    retryAfterSeconds?: number,
    details?: CreateOrderErrorResponse['error']['details'],
  ) {
    super(message);
    this.name = 'CreateOrderApiError';
    this.code = code;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
    this.details = details;
  }
}

function isOrderResponse(value: unknown): value is CreateOrderResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return confirmationSchema.safeParse(value).success;
}

function isErrorResponse(value: unknown): value is CreateOrderErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return errorSchema.safeParse(value).success;
}

export async function createOrderRequest(
  request: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(20_000),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After');
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    const parsedDate = retryAfter ? Date.parse(retryAfter) : NaN;
    const retrySeconds = Number.isFinite(seconds)
      ? Math.max(1, seconds)
      : Number.isFinite(parsedDate)
        ? Math.max(1, Math.ceil((parsedDate - Date.now()) / 1000))
        : undefined;
    if (response.status === 429)
      throw new CreateOrderApiError(
        'RATE_LIMITED',
        'Previše pokušaja. Sačekajte pre ponovnog slanja.',
        undefined,
        retrySeconds ?? 60,
      );
    if (isErrorResponse(body)) {
      throw new CreateOrderApiError(
        body.error.code,
        body.error.message,
        body.requestId,
        retrySeconds,
        body.error.details,
      );
    }

    throw new CreateOrderApiError(
      'INTERNAL_ERROR',
      'Server je vratio neočekivan odgovor.',
    );
  }

  if (!isOrderResponse(body)) {
    throw new CreateOrderApiError(
      'INTERNAL_ERROR',
      'Server je vratio neočekivan odgovor.',
    );
  }

  return body;
}

export async function createDraftSignature(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

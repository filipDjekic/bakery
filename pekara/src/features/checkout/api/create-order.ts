import type {
  CreateOrderErrorResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from '../types';

export class CreateOrderApiError extends Error {
  readonly code: CreateOrderErrorResponse['error']['code'];
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(
    code: CreateOrderErrorResponse['error']['code'],
    message: string,
    requestId?: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'CreateOrderApiError';
    this.code = code;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function isOrderResponse(value: unknown): value is CreateOrderResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Partial<CreateOrderResponse>;
  return (
    typeof response.orderId === 'string' &&
    typeof response.orderNumber === 'string' &&
    typeof response.status === 'string' &&
    typeof response.pickupAt === 'string' &&
    typeof response.totalMinor === 'number' &&
    typeof response.currencyCode === 'string'
  );
}

function isErrorResponse(value: unknown): value is CreateOrderErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Partial<CreateOrderErrorResponse>;
  return (
    typeof response.requestId === 'string' &&
    Boolean(response.error) &&
    typeof response.error?.code === 'string' &&
    typeof response.error?.message === 'string'
  );
}

export async function createOrderRequest(
  request: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isErrorResponse(body)) {
      const retryAfter = response.headers.get('Retry-After');
      throw new CreateOrderApiError(
        body.error.code,
        body.error.message,
        body.requestId,
        retryAfter ? Number(retryAfter) : undefined,
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

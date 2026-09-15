import { createHash } from 'node:crypto';

import type { CheckoutRequest } from '../validation/checkout.ts';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, entryValue]) => [key, canonicalize(entryValue)]),
    );
  }

  return value;
}

export function canonicalPayloadSerializer(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));

  if (serialized === undefined) {
    throw new Error('Payload cannot be serialized as canonical JSON.');
  }

  return serialized;
}

export function createCheckoutPayloadHash(request: CheckoutRequest): string {
  const payload = {
    customerName: request.customerName,
    customerPhone: request.customerPhone,
    customerEmail: request.customerEmail,
    note: request.note,
    pickupAt: request.pickupAt,
    items: [...request.items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    ),
  };

  return createHash('sha256')
    .update(canonicalPayloadSerializer(payload))
    .digest('hex');
}

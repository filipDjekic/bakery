import { z } from 'zod';
import { checkoutRequestSchema } from '@/validation/checkout';
import type { CreateOrderRequest } from '../types';
import type { CartItem } from '@/features/cart/types';

export type PendingSubmission = {
  request: CreateOrderRequest;
  items: CartItem[];
  pickupDate: string;
};
const key = 'bakery:checkout-pending';
const schema = z.object({
  request: checkoutRequestSchema,
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        displayPriceMinor: z.number().int().nonnegative(),
        quantity: z.number().int().positive(),
        unitLabel: z.string().nullable().optional(),
      }),
    )
    .max(20),
});

/** Session-only recovery; blocked storage still leaves the mounted form usable. */
export function readPendingSubmission(): PendingSubmission | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    const parsed = schema.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function writePendingSubmission(value: PendingSubmission | null) {
  try {
    if (value) window.sessionStorage.setItem(key, JSON.stringify(value));
    else window.sessionStorage.removeItem(key);
  } catch {
    /* The form retains its in-memory copy. */
  }
}

/** Hydration reads the server snapshot first, then adopts session storage. */
export function createPendingSubmissionStore() {
  let value: PendingSubmission | null | undefined;
  const listeners = new Set<() => void>();
  return {
    getSnapshot() {
      if (value === undefined) value = readPendingSubmission();
      return value;
    },
    getServerSnapshot: () => null,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: PendingSubmission | null) {
      value = next;
      writePendingSubmission(next);
      listeners.forEach((listener) => listener());
    },
  };
}

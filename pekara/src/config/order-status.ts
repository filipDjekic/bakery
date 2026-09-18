import type { PublicOrderStatus } from '../types/order.ts';

export const ORDER_STATUS_TRANSITIONS = {
  NEW: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PREPARATION', 'CANCELLED'],
  IN_PREPARATION: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
} as const satisfies Record<
  PublicOrderStatus,
  readonly PublicOrderStatus[]
>;

export const TERMINAL_ORDER_STATUSES = new Set<PublicOrderStatus>([
  'COMPLETED',
  'CANCELLED',
]);

export function canTransitionOrderStatus(
  current: PublicOrderStatus,
  target: PublicOrderStatus,
): boolean {
  const transitions = ORDER_STATUS_TRANSITIONS[
    current
  ] as readonly PublicOrderStatus[];
  return transitions.includes(target);
}

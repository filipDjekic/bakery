import type { PublicOrderStatus } from '../types/order.ts';

export type OrderStatusMeta = {
  label: string;
  badgeClassName: string;
  dotClassName: string;
  actionLabel: string;
};

export const ORDER_STATUS_META = {
  NEW: {
    label: 'Nova',
    badgeClassName: 'border-amber-300 bg-amber-50 text-amber-900',
    dotClassName: 'bg-amber-500',
    actionLabel: 'Nova porudžbina',
  },
  ACCEPTED: {
    label: 'Prihvaćena',
    badgeClassName: 'border-blue-300 bg-blue-50 text-blue-900',
    dotClassName: 'bg-blue-500',
    actionLabel: 'Prihvati porudžbinu',
  },
  IN_PREPARATION: {
    label: 'U pripremi',
    badgeClassName: 'border-orange-300 bg-orange-50 text-orange-900',
    dotClassName: 'bg-orange-500',
    actionLabel: 'Započni pripremu',
  },
  READY: {
    label: 'Spremna',
    badgeClassName: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    dotClassName: 'bg-emerald-500',
    actionLabel: 'Označi kao spremnu',
  },
  COMPLETED: {
    label: 'Završena',
    badgeClassName: 'border-slate-300 bg-slate-100 text-slate-800',
    dotClassName: 'bg-slate-500',
    actionLabel: 'Označi kao završenu',
  },
  CANCELLED: {
    label: 'Otkazana',
    badgeClassName: 'border-red-300 bg-red-50 text-red-900',
    dotClassName: 'bg-red-500',
    actionLabel: 'Otkaži porudžbinu',
  },
} as const satisfies Record<PublicOrderStatus, OrderStatusMeta>;

export function getOrderStatusMeta(status: PublicOrderStatus): OrderStatusMeta {
  return ORDER_STATUS_META[status];
}

export const ORDER_STATUS_TRANSITIONS = {
  NEW: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PREPARATION', 'CANCELLED'],
  IN_PREPARATION: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
} as const satisfies Record<PublicOrderStatus, readonly PublicOrderStatus[]>;

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

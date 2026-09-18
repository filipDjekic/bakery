'use client';

import { useActionState } from 'react';

import type { PublicOrderStatus } from '@/types/order';
import { ORDER_STATUS_TRANSITIONS } from '@/config/order-status';

import { updateOrderStatusAction } from '../actions/update-order-status';

export function OrderStatusActions({ id, status }: { id: string; status: PublicOrderStatus }) {
  const [state, action, pending] = useActionState(updateOrderStatusAction, {});
  const targets = ORDER_STATUS_TRANSITIONS[status] as readonly PublicOrderStatus[];
  if (targets.length === 0) return <p>Ovo je terminalni status.</p>;

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="orderId" value={id} />
      <input type="hidden" name="currentStatus" value={status} />
      <label className="block font-medium" htmlFor="targetStatus">Novi status</label>
      <select id="targetStatus" name="targetStatus" className="min-h-11 rounded-md border px-3" required>
        {targets.map((target) => <option key={target} value={target}>{target}</option>)}
      </select>
      <label className="block font-medium" htmlFor="cancellationReason">Razlog otkazivanja</label>
      <textarea id="cancellationReason" name="cancellationReason" className="block w-full rounded-md border p-3" />
      <button disabled={pending} className="bg-primary rounded-md px-4 py-3 font-semibold text-white" type="submit">
        {pending ? 'Čuvanje…' : 'Promeni status'}
      </button>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
    </form>
  );
}

'use client';

import { useActionState } from 'react';

import { ORDER_STATUS_TRANSITIONS } from '@/config/order-status';
import type { PublicOrderStatus } from '@/types/order';

import { updateOrderStatusAction } from '../actions/update-order-status';
import { CancelOrderDialog } from './cancel-order-dialog';

export function OrderStatusActions({ id, status }: { id: string; status: PublicOrderStatus }) {
  const [state, action, pending] = useActionState(updateOrderStatusAction, {});
  const targets = ORDER_STATUS_TRANSITIONS[status] as readonly PublicOrderStatus[];
  if (targets.length === 0) return <p>Ovo je terminalni status.</p>;
  const regularTargets = targets.filter((target) => target !== 'CANCELLED');

  return (
    <section aria-labelledby="order-status-actions" className="mt-6">
      <h2 id="order-status-actions" className="text-lg font-semibold">Promena statusa</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {regularTargets.map((target) => (
          <form action={action} key={target}>
            <input type="hidden" name="orderId" value={id} />
            <input type="hidden" name="currentStatus" value={status} />
            <input type="hidden" name="targetStatus" value={target} />
            <button disabled={pending} className="bg-primary min-h-11 rounded-md px-4 py-2 font-semibold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none" type="submit">Postavi status {target}</button>
          </form>
        ))}
        {targets.includes('CANCELLED') ? <CancelOrderDialog action={action} currentStatus={status} orderId={id} pending={pending} /> : null}
      </div>
      <div aria-live="polite" className="mt-4 min-h-6">
        {state.error ? <p role="alert" tabIndex={-1}>{state.error}</p> : null}
        {state.success ? <p role="status">{state.success}</p> : null}
      </div>
    </section>
  );
}

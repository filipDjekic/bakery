'use client';

import { useActionState } from 'react';

import {
  getOrderStatusMeta,
  ORDER_STATUS_TRANSITIONS,
} from '@/config/order-status';
import type { PublicOrderStatus } from '@/types/order';

import { updateOrderStatusAction } from '../actions/update-order-status';
import { CancelOrderDialog } from './cancel-order-dialog';

export function OrderStatusActions({
  id,
  status,
}: {
  id: string;
  status: PublicOrderStatus;
}) {
  const [state, action, pending] = useActionState(updateOrderStatusAction, {});
  const targets = ORDER_STATUS_TRANSITIONS[
    status
  ] as readonly PublicOrderStatus[];
  const regularTargets = targets.filter((target) => target !== 'CANCELLED');

  return (
    <section
      aria-labelledby="order-status-actions"
      className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6"
    >
      <h2 id="order-status-actions" className="text-xl font-semibold">
        Promena statusa
      </h2>
      <p className="text-muted mt-1 text-sm">
        Ažuriraj status porudžbine ili je otkaži.
      </p>

      {targets.length === 0 ? (
        <p className="border-border bg-surface-muted text-muted mt-5 rounded-lg border px-4 py-3 text-sm">
          Porudžbina je u terminalnom statusu i više se ne može menjati.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {regularTargets.map((target) => (
            <form action={action} key={target} className="sm:w-auto">
              <input type="hidden" name="orderId" value={id} />
              <input type="hidden" name="currentStatus" value={status} />
              <input type="hidden" name="targetStatus" value={target} />
              <button
                disabled={pending}
                className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 w-full rounded-lg px-5 py-2.5 font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                type="submit"
              >
                {getOrderStatusMeta(target).actionLabel}
              </button>
            </form>
          ))}
          {targets.includes('CANCELLED') ? (
            <CancelOrderDialog
              action={action}
              currentStatus={status}
              orderId={id}
              pending={pending}
            />
          ) : null}
        </div>
      )}

      <div aria-live="polite" className="mt-4 min-h-6 text-sm">
        {state.error ? (
          <p className="font-medium text-red-800" role="alert" tabIndex={-1}>
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="font-medium text-emerald-800" role="status">
            {state.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}

'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { retryNotifications } from '../actions/retry-notifications';
export function RetryNotificationButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(retryNotifications, {});
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="orderId" value={orderId} />
      <Button variant="outline" disabled={pending}>
        {pending ? 'Slanje…' : 'Ponovi neuspešno slanje'}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {state.error}
        </p>
      ) : (
        <p role="status" className="mt-3 text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}

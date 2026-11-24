'use server';
import { revalidatePath } from 'next/cache';
import { retryOrderNotifications } from '@/server/services/retry-order-notifications';
import { safeActionFailure } from '@/server/errors/safe-action-result';
export type RetryNotificationState = { error?: string; message?: string };
export async function retryNotifications(
  _state: RetryNotificationState,
  form: FormData,
): Promise<RetryNotificationState> {
  const id = String(form.get('orderId') ?? '');
  try {
    const result = await retryOrderNotifications(id);
    revalidatePath(`/admin/orders/${id}`);
    return result.failed
      ? {
          error:
            'Slanje nije uspelo. Proverite podešavanja i evidenciju pokušaja.',
        }
      : {
          message: result.pending
            ? 'Slanje je u toku ili čeka dostupan pokušaj.'
            : 'Obaveštenja su obrađena.',
        };
  } catch (error) {
    const result = safeActionFailure(error);
    return {
      error: result.ok ? 'Pokušaj nije završen.' : result.error.message,
    };
  }
}

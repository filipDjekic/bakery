'use server';

import { revalidatePath } from 'next/cache';

import { changeOrderStatus } from '@/server/services/change-order-status';

export type OrderStatusActionState = { error?: string; success?: string };

export async function updateOrderStatusAction(
  _state: OrderStatusActionState,
  formData: FormData,
): Promise<OrderStatusActionState> {
  try {
    const orderId = String(formData.get('orderId') ?? '');
    await changeOrderStatus({
      orderId,
      currentStatus: formData.get('currentStatus'),
      targetStatus: formData.get('targetStatus'),
      cancellationReason: formData.get('cancellationReason') || undefined,
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    return { success: 'Status je sačuvan.' };
  } catch {
    return { error: 'Status nije promenjen. Osvežite stranicu i pokušajte ponovo.' };
  }
}

import { notFound } from 'next/navigation';

import { OrderStatusActions } from '@/features/admin-orders/components/order-status-actions';
import { formatRsd } from '@/lib/money';
import { getAdminOrder } from '@/server/queries/admin-order';

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold">Porudžbina {order.orderNumber}</h1>
      <p className="mt-2">Status: <strong>{order.status}</strong></p>
      <p>Kupac: {order.customerName}</p>
      <p>Ukupno: {formatRsd(order.totalMinor)}</p>
      <ul className="mt-6 space-y-2">
        {order.items.map((item) => <li key={item.id}>{item.productName} × {item.quantity}</li>)}
      </ul>
      <OrderStatusActions id={order.id} status={order.status} />
    </div>
  );
}

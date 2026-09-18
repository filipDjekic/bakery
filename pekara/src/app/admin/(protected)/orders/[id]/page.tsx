import { notFound } from 'next/navigation';

import { OrderStatusActions } from '@/features/admin-orders/components/order-status-actions';
import { formatRsd } from '@/lib/money';
import { getAdminOrder } from '@/server/queries/admin-order';

export const instant = false;

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await getAdminOrder(id);

  if (!order) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">
        Porudžbina {order.orderNumber}
      </h1>

      <p className="mt-2">
        Status: <strong>{order.status}</strong>
      </p>

      <p>
        <span className="font-bold">Kupac: </span>
        {order.customerName}
      </p>

      <p>
        <span className="font-bold">Ukupno: </span>
        {formatRsd(order.totalMinor)}
      </p>

      <p className="font-bold text-lg mt-6">Detalji porudzbine: </p>
      <div className="mb-6">
        <ul className="space-y-1 list-disc pl-6 marker:text-primary">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.productName} × {item.quantity}
          </li>
        ))}
      </ul>
      </div>

      <OrderStatusActions
        id={order.id}
        status={order.status}
      />
    </div>
  );
}
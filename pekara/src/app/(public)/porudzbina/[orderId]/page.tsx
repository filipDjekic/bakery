import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Container } from '@/components/layout/container';
import { OrderConfirmation } from '@/features/orders/components/order-confirmation';
import { getPublicOrderConfirmation } from '@/server/queries/order-confirmation';

export const metadata: Metadata = {
  title: 'Potvrda porudžbine',
  robots: { index: false, follow: false },
};

export const instant = false;

type OrderConfirmationPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderConfirmationPage({
  params,
}: OrderConfirmationPageProps) {
  const { orderId } = await params;
  const order = await getPublicOrderConfirmation(orderId);

  if (!order) {
    notFound();
  }

  return (
    <div className="py-10 sm:py-14 lg:py-20">
      <Container>
        <OrderConfirmation order={order} />
      </Container>
    </div>
  );
}

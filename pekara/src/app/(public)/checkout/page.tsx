import type { Metadata } from 'next';
import { connection } from 'next/server';

import { Container } from '@/components/layout/container';
import { CheckoutForm } from '@/features/checkout/components/checkout-form';
import { getPickupAvailability } from '@/server/services/pickup-slots';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function CheckoutPage() {
  await connection();
  const pickupAvailability = await getPickupAvailability();
  return (
    <div className="py-10 sm:py-14 lg:py-20">
      <Container>
        <header className="max-w-3xl">
          <p className="text-primary text-sm font-semibold tracking-wider uppercase">
            Preuzimanje u pekari
          </p>
          <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Podaci za porudžbinu
          </h1>
          <p className="text-muted mt-5 text-lg leading-8">
            Unesite kontakt podatke i izaberite dostupan termin preuzimanja.
          </p>
        </header>

        <div className="mt-10">
          <CheckoutForm pickupAvailability={pickupAvailability} />
        </div>
      </Container>
    </div>
  );
}

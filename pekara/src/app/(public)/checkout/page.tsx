import type { Metadata } from 'next';
import { connection } from 'next/server';

import { PublicPageShell } from '@/components/layout/page-shell';
import {
  PageDescription,
  PageEyebrow,
  PageTitle,
} from '@/components/ui/typography';
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
    <PublicPageShell>
      <header className="max-w-3xl">
        <PageEyebrow>Preuzimanje u pekari</PageEyebrow>
        <PageTitle className="mt-2">Podaci za porudžbinu</PageTitle>
        <PageDescription className="mt-5">
          Unesite kontakt podatke i izaberite dostupan termin preuzimanja.
        </PageDescription>
      </header>

      <div className="mt-10">
        <CheckoutForm pickupAvailability={pickupAvailability} />
      </div>
    </PublicPageShell>
  );
}

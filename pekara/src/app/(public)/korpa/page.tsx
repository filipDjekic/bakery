import type { Metadata } from 'next';

import { PublicPageShell } from '@/components/layout/page-shell';
import {
  PageDescription,
  PageEyebrow,
  PageTitle,
} from '@/components/ui/typography';
import { Cart } from '@/features/cart/components/cart';

export const metadata: Metadata = {
  title: 'Korpa',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <PublicPageShell>
      <header className="max-w-3xl">
        <PageEyebrow>Vaša porudžbina</PageEyebrow>
        <PageTitle className="mt-2">Korpa</PageTitle>
        <PageDescription className="mt-5">
          Proverite izabrane proizvode pre nego što nastavite na poručivanje.
        </PageDescription>
      </header>

      <div className="mt-10">
        <Cart />
      </div>
    </PublicPageShell>
  );
}

import type { Metadata } from 'next';

import { Container } from '@/components/layout/container';
import { Cart } from '@/features/cart/components/cart';

export const metadata: Metadata = {
  title: 'Korpa',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="py-10 sm:py-14 lg:py-20">
      <Container>
        <header className="max-w-3xl">
          <p className="text-primary text-sm font-semibold tracking-wider uppercase">
            Vaša porudžbina
          </p>
          <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Korpa
          </h1>
          <p className="text-muted mt-5 text-lg leading-8">
            Proverite izabrane proizvode pre nego što nastavite na poručivanje.
          </p>
        </header>

        <div className="mt-10">
          <Cart />
        </div>
      </Container>
    </div>
  );
}

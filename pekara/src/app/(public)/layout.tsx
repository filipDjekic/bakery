import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { PublicFooter } from '@/components/layout/public-footer';
import { PublicHeader } from '@/components/layout/public-header';
import { CartDrawer } from '@/features/cart/components/cart-drawer';
import { MobileCartBar } from '@/features/cart/components/mobile-cart-bar';

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <Suspense fallback={null}>
        <MobileCartBar />
      </Suspense>
      <Suspense fallback={null}>
        <PublicFooter />
      </Suspense>
      <CartDrawer />
    </div>
  );
}

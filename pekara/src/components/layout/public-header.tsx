import { ShoppingBasket, Wheat } from 'lucide-react';
import Link from 'next/link';

import { CartCount } from '@/features/cart/components/cart-count';
import { getPublicChromeContent } from '@/server/queries/public-settings';

import { Container } from './container';
import { MobileNav } from './mobile-nav';
import { PublicNav } from './public-nav';

export async function PublicHeader() {
  const settings = await getPublicChromeContent();

  return (
    <header className="border-border bg-background/95 sticky top-0 z-50 border-b backdrop-blur-md">
      <Container>
        <div className="flex h-18 items-center justify-between gap-4">
          <Link
            href="/"
            className="focus-visible:ring-primary flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
          >
            <span className="bg-primary text-surface inline-flex size-10 shrink-0 items-center justify-center rounded-full">
              <Wheat aria-hidden size={21} />
            </span>
            <span className="text-foreground block truncate text-lg font-bold tracking-tight sm:text-xl">
              {settings?.bakeryName ?? 'Pekara'}
            </span>
          </Link>

          <PublicNav />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/korpa"
              className="border-border bg-surface text-foreground hover:border-primary focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ShoppingBasket aria-hidden size={19} />
              <CartCount />
            </Link>
            <Link
              href="/proizvodi"
              className="bg-primary hover:bg-primary-hover focus-visible:ring-primary hidden min-h-11 items-center rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex"
            >
              Poruči
            </Link>
            <MobileNav />
          </div>
        </div>
      </Container>
    </header>
  );
}

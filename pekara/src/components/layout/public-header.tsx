import Link from 'next/link';

import { CartCount } from '@/features/cart/components/cart-count';
import { getPublicChromeSettings } from '@/server/queries/public-settings';

import { Container } from './container';
import { MobileNav } from './mobile-nav';
import { PublicNav } from './public-nav';

export async function PublicHeader() {
  const settings = await getPublicChromeSettings();

  return (
    <header className="relative z-40 border-b border-border bg-surface-muted">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="min-w-0 shrink text-xl font-bold tracking-tight text-foreground focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4 focus-visible:outline-none"
          >
            <span className="block truncate">
              {settings?.bakeryName ?? 'Pekara'}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <PublicNav />

            <Link
              href="/korpa"
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <CartCount />
            </Link>

            <MobileNav />
          </div>
        </div>
      </Container>
    </header>
  );
}

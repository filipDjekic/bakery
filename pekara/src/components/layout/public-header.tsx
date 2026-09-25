import { Wheat } from 'lucide-react';
import Link from 'next/link';

import { focusRingClassName } from '@/components/ui/focus';
import { CartTrigger } from '@/features/cart/components/cart-trigger';
import { cn } from '@/lib/cn';
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
            className={cn(
              'flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-offset-4',
              focusRingClassName,
            )}
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
            <CartTrigger />
            <MobileNav />
          </div>
        </div>
      </Container>
    </header>
  );
}

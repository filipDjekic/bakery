'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { focusRingInsetClassName } from '@/components/ui/focus';
import { cn } from '@/lib/cn';

const mobileAdminLinkClassName = cn(
  'hover:bg-surface-muted block min-h-11 rounded-md px-3 py-2 font-medium',
  focusRingInsetClassName,
);

export function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        type="button"
        aria-expanded={isOpen}
        aria-controls="admin-mobile-menu"
        onClick={() => setIsOpen((open) => !open)}
        variant="outline"
        size="sm"
      >
        {isOpen ? 'Zatvori meni' : 'Meni'}
      </Button>
      {isOpen ? (
        <nav
          id="admin-mobile-menu"
          aria-label="Mobilna admin navigacija"
          className="border-border bg-surface absolute inset-x-0 top-full z-20 border-b p-4 shadow-sm"
        >
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className={mobileAdminLinkClassName}
          >
            Početna
          </Link>
          <Link
            href="/admin/orders"
            onClick={() => setIsOpen(false)}
            className={mobileAdminLinkClassName}
          >
            Porudžbine
          </Link>
          <Link
            href="/admin/products"
            onClick={() => setIsOpen(false)}
            className={mobileAdminLinkClassName}
          >
            Proizvodi
          </Link>
          <Link
            href="/admin/categories"
            onClick={() => setIsOpen(false)}
            className={mobileAdminLinkClassName}
          >
            Kategorije
          </Link>
          <Link
            href="/admin/settings"
            onClick={() => setIsOpen(false)}
            className={mobileAdminLinkClassName}
          >
            Podešavanja
          </Link>
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={cn(mobileAdminLinkClassName, 'text-muted font-normal')}
          >
            Javni sajt
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

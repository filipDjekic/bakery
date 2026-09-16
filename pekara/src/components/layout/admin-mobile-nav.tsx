'use client';

import Link from 'next/link';
import { useState } from 'react';

export function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="admin-mobile-menu"
        onClick={() => setIsOpen((open) => !open)}
        className="border-border focus-visible:ring-primary min-h-10 rounded-md border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
      >
        {isOpen ? 'Zatvori meni' : 'Meni'}
      </button>
      {isOpen ? (
        <nav
          id="admin-mobile-menu"
          aria-label="Mobilna admin navigacija"
          className="border-border bg-surface absolute inset-x-0 top-full z-20 border-b p-4 shadow-sm"
        >
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="block rounded-md px-3 py-2 font-medium"
          >
            Početna
          </Link>
          <Link
            href="/admin/orders"
            onClick={() => setIsOpen(false)}
            className="block rounded-md px-3 py-2 font-medium"
          >
            Porudžbine
          </Link>
          <Link
            href="/admin/products"
            onClick={() => setIsOpen(false)}
            className="block rounded-md px-3 py-2 font-medium"
          >
            Proizvodi
          </Link>
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="text-muted block rounded-md px-3 py-2"
          >
            Javni sajt
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

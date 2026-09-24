'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { publicNavigation } from './public-nav';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? 'Zatvori navigaciju' : 'Otvori navigaciju'}
        onClick={() => setIsOpen((current) => !current)}
        className="border-border text-foreground hover:bg-surface-muted focus-visible:ring-primary inline-flex size-11 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {isOpen ? <X aria-hidden size={21} /> : <Menu aria-hidden size={21} />}
      </button>

      {isOpen ? (
        <div
          id="mobile-navigation"
          className="border-border bg-surface absolute inset-x-0 top-full z-50 border-b shadow-lg"
        >
          <nav
            aria-label="Mobilna navigacija"
            className="mx-auto max-w-7xl px-4 py-4 sm:px-6"
          >
            <ul className="flex flex-col">
              {publicNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-foreground hover:bg-surface-muted focus-visible:ring-primary block min-h-11 rounded-lg px-3 py-3 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

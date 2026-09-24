'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Container } from './container';

const navigation = [
  {
    label: 'Početna',
    href: '/',
  },
  {
    label: 'Proizvodi',
    href: '/proizvodi',
  },
];

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

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? 'Zatvori navigaciju' : 'Otvori navigaciju'}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex size-10 items-center justify-center rounded-md border border-border text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {isOpen ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="size-5"
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="size-5"
          >
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div
          id="mobile-navigation"
          className="absolute inset-x-0 top-full z-50 border-b border-border bg-surface-muted shadow-sm"
        >
          <Container>
            <nav aria-label="Mobilna navigacija" className="py-4">
              <ul className="flex flex-col">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:outline-none"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </div>
      )}
    </div>
  );
}

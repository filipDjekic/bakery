import Link from 'next/link';

import { focusRingClassName } from '@/components/ui/focus';
import { cn } from '@/lib/cn';

export const publicNavigation = [
  { label: 'Početna', href: '/' },
  { label: 'Proizvodi', href: '/proizvodi' },
  { label: 'Kako funkcioniše', href: '/#kako-funkcionise' },
  { label: 'Kontakt', href: '/#kontakt' },
] as const;

export function PublicNav() {
  return (
    <nav aria-label="Glavna navigacija" className="hidden lg:block">
      <ul className="flex items-center gap-7">
        {publicNavigation.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'text-muted hover:text-primary rounded-sm text-sm font-semibold transition-colors focus-visible:ring-offset-4',
                focusRingClassName,
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

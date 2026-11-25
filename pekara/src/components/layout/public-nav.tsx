'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { focusRingClassName } from '@/components/ui/focus';
import { cn } from '@/lib/cn';

import { publicNavigation } from './public-navigation';

export function PublicNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Glavna navigacija" className="hidden lg:block">
      <ul className="flex items-center gap-7">
        {publicNavigation.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={cn(
                pathname === item.href ? 'text-primary' : 'text-muted',
                'hover:text-primary rounded-sm text-sm font-semibold transition-colors focus-visible:ring-offset-4',
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

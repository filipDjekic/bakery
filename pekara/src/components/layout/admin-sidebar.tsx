import Link from 'next/link';

import { focusRingInsetClassName } from '@/components/ui/focus';
import { cn } from '@/lib/cn';

const adminLinkClassName = cn(
  'hover:bg-surface-muted block rounded-md px-3 py-2 font-medium',
  focusRingInsetClassName,
);

export function AdminSidebar() {
  return (
    <aside className="border-border bg-surface hidden min-h-screen w-64 shrink-0 border-r lg:block">
      <div className="sticky top-0 p-6">
        <Link href="/admin" className="text-xl font-bold">
          Pekara Admin
        </Link>
        <nav aria-label="Admin navigacija" className="mt-8 space-y-2">
          <Link href="/admin" className={adminLinkClassName}>
            Početna
          </Link>
          <Link href="/admin/orders" className={adminLinkClassName}>
            Porudžbine
          </Link>
          <Link href="/admin/products" className={adminLinkClassName}>
            Proizvodi
          </Link>
          <Link href="/admin/categories" className={adminLinkClassName}>
            Kategorije
          </Link>
          <Link href="/admin/settings" className={adminLinkClassName}>
            Podešavanja
          </Link>
          <Link
            href="/"
            className={cn(adminLinkClassName, 'text-muted text-sm font-normal')}
          >
            Otvori javni sajt
          </Link>
        </nav>
      </div>
    </aside>
  );
}

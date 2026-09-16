import Link from 'next/link';

export function AdminSidebar() {
  return (
    <aside className="border-border bg-surface hidden min-h-screen w-64 shrink-0 border-r lg:block">
      <div className="sticky top-0 p-6">
        <Link href="/admin" className="text-xl font-bold">
          Pekara Admin
        </Link>
        <nav aria-label="Admin navigacija" className="mt-8 space-y-2">
          <Link
            href="/admin"
            className="hover:bg-surface-muted focus-visible:ring-primary block rounded-md px-3 py-2 font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Početna
          </Link>
          <Link
            href="/admin/orders"
            className="hover:bg-surface-muted focus-visible:ring-primary block rounded-md px-3 py-2 font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Porudžbine
          </Link>
          <Link
            href="/"
            className="text-muted hover:bg-surface-muted focus-visible:ring-primary block rounded-md px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            Otvori javni sajt
          </Link>
        </nav>
      </div>
    </aside>
  );
}

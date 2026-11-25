'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const labels: Record<string, string> = {
  orders: 'Porudžbine',
  products: 'Proizvodi',
  categories: 'Kategorije',
  settings: 'Podešavanja',
  new: 'Kreiranje',
};
export function AdminBreadcrumbs() {
  const segments = usePathname().split('/').filter(Boolean);
  if (segments.length < 2) return null;
  return (
    <nav aria-label="Putanja stranice" className="mb-4 text-sm">
      <ol className="text-muted flex flex-wrap items-center gap-2">
        <li>
          <Link className="hover:text-primary underline" href="/admin">
            Početna
          </Link>
        </li>
        {segments.slice(1).map((segment, index) => {
          const last = index === segments.length - 2;
          const title = labels[segment] ?? 'Detalji';
          return (
            <li key={index} className="flex gap-2">
              <span aria-hidden="true">/</span>
              {last ? (
                <span
                  aria-current="page"
                  className="text-foreground font-medium"
                >
                  {title}
                </span>
              ) : (
                <Link
                  href={`/${segments.slice(0, index + 2).join('/')}`}
                  className="hover:text-primary underline"
                >
                  {title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

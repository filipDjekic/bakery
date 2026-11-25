'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
export function PublicBreadcrumbs() {
  const path = usePathname();
  const title =
    path === '/korpa'
      ? 'Korpa'
      : path === '/checkout'
        ? 'Podaci i preuzimanje'
        : path.startsWith('/porudzbina/')
          ? 'Potvrda porudžbine'
          : path.startsWith('/proizvodi/')
            ? 'Detalji proizvoda'
            : null;
  if (!title) return null;
  return (
    <nav
      aria-label="Putanja stranice"
      className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center gap-2 px-4 text-sm sm:px-6"
    >
      <Link href="/" className="text-primary underline">
        Početna
      </Link>
      <span aria-hidden="true">/</span>
      <Link href="/proizvodi" className="text-primary underline">
        Proizvodi
      </Link>
      {path === '/checkout' ? (
        <>
          <span aria-hidden="true">/</span>
          <Link href="/korpa" className="text-primary underline">
            Korpa
          </Link>
        </>
      ) : null}
      <span aria-hidden="true">/</span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('Public route render failed.', error);
  }, [error]);
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-2xl items-center px-4 py-16">
      <div className="border-border bg-surface w-full rounded-xl border p-8 text-center shadow-sm">
        <p className="text-primary text-sm font-bold tracking-wider uppercase">
          Privremena greška
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          Stranica trenutno nije dostupna
        </h1>
        <p className="text-muted mt-4">
          Pokušajte ponovo. Ako se problem nastavi, vratite se na početnu
          stranicu ili katalog.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="bg-primary hover:bg-primary-hover min-h-11 rounded-md px-5 py-2 font-semibold text-white"
          >
            Pokušaj ponovo
          </button>
          <Link
            href="/"
            className="border-border min-h-11 rounded-md border px-5 py-2 font-semibold"
          >
            Početna
          </Link>
          <Link
            href="/proizvodi"
            className="border-border min-h-11 rounded-md border px-5 py-2 font-semibold"
          >
            Proizvodi
          </Link>
        </div>
      </div>
    </section>
  );
}

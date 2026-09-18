'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('Admin route render failed.', error);
  }, [error]);
  return (
    <section className="border-border bg-surface mx-auto max-w-2xl rounded-xl border p-8">
      <p className="text-sm font-bold tracking-wider text-red-700 uppercase">
        Greška
      </p>
      <h1 className="mt-3 text-2xl font-bold">Admin sadržaj nije učitan</h1>
      <p className="text-muted mt-3">
        Pokušajte ponovo. Nijedna nesačuvana operacija nije potvrđena ovim
        prikazom.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-zinc-600">
          Referenca greške: {error.digest}
        </p>
      ) : null}
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="bg-primary hover:bg-primary-hover min-h-11 rounded-md px-5 py-2 font-semibold text-white"
        >
          Pokušaj ponovo
        </button>
        <Link
          href="/admin"
          className="border-border min-h-11 rounded-md border px-5 py-2 font-semibold"
        >
          Admin početna
        </Link>
      </div>
    </section>
  );
}

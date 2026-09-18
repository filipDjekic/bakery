import Link from 'next/link';

export default function PublicNotFound() {
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-2xl items-center px-4 py-16">
      <div className="border-border bg-surface w-full rounded-xl border p-8 text-center">
        <p className="text-primary text-sm font-bold tracking-wider uppercase">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold">Stranica nije pronađena</h1>
        <p className="text-muted mt-4">
          Traženi sadržaj ne postoji ili više nije dostupan.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="bg-primary hover:bg-primary-hover min-h-11 rounded-md px-5 py-2 font-semibold text-white"
          >
            Početna
          </Link>
          <Link
            href="/proizvodi"
            className="border-border min-h-11 rounded-md border px-5 py-2 font-semibold"
          >
            Pogledaj proizvode
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';

export function CartEmptyState() {
  return (
    <div className="border-border bg-surface-muted rounded-xl border px-6 py-12 text-center sm:px-10">
      <h2 className="text-foreground text-xl font-semibold">
        Vaša korpa je prazna
      </h2>
      <p className="text-muted mx-auto mt-3 max-w-lg leading-7">
        Pogledajte našu ponudu i dodajte proizvode koje želite da preuzmete u
        pekari.
      </p>
      <Link
        href="/proizvodi"
        className="bg-primary hover:bg-primary-hover focus-visible:ring-primary mt-6 inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Pogledaj proizvode
      </Link>
    </div>
  );
}

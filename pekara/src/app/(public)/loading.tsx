export default function PublicLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="mx-auto max-w-6xl px-4 py-12"
    >
      <span className="sr-only">Učitavanje sadržaja…</span>
      <div className="animate-pulse space-y-8" aria-hidden="true">
        <div className="h-10 w-2/3 rounded bg-zinc-200" />
        <div className="h-5 w-full max-w-2xl rounded bg-zinc-200" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-72 rounded-xl bg-zinc-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

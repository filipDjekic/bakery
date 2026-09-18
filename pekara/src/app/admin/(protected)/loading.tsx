export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Učitavanje admin sadržaja…</span>
      <div className="animate-pulse space-y-6" aria-hidden="true">
        <div className="h-8 w-64 rounded bg-zinc-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 rounded-xl bg-zinc-200" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-zinc-200" />
      </div>
    </div>
  );
}

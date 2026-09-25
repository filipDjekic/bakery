import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-5xl">
      <span className="sr-only" role="status">
        Učitavanje podešavanja…
      </span>
      <Skeleton className="h-9 w-52" />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />
      <div className="mt-6 grid grid-cols-2 gap-2 sm:flex">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full sm:w-32" />
        ))}
      </div>
      <div className="mt-8 space-y-8">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="border-border bg-surface rounded-xl border p-6"
            aria-hidden="true"
          >
            <Skeleton className="h-7 w-44" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="mt-6 ml-auto h-11 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

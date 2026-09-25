import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Učitavanje porudžbina…
      </span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-36" />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-56" />
        ))}
      </div>
    </div>
  );
}

import { Container } from '@/components/layout/container';

const skeletonCards = Array.from({ length: 8 }, (_, index) => index);

export default function ProductsLoading() {
  return (
    <div className="py-12 sm:py-16 lg:py-20" aria-busy="true">
      <Container>
        <span className="sr-only" role="status">
          Učitavanje proizvoda
        </span>

        <div className="max-w-3xl animate-pulse">
          <div className="bg-border h-4 w-28 rounded" />
          <div className="bg-border mt-4 h-11 w-52 rounded" />
          <div className="bg-border mt-5 h-6 max-w-xl rounded" />
        </div>

        <div className="mt-12 animate-pulse">
          <div className="bg-border h-8 w-44 rounded" />
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {skeletonCards.map((card) => (
              <div
                key={card}
                aria-hidden="true"
                className="border-border bg-surface overflow-hidden rounded-xl border"
              >
                <div className="bg-surface-muted aspect-square" />
                <div className="space-y-4 p-5">
                  <div className="bg-border h-6 w-3/4 rounded" />
                  <div className="bg-border h-4 w-full rounded" />
                  <div className="bg-border h-4 w-4/5 rounded" />
                  <div className="bg-border mt-6 h-11 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}

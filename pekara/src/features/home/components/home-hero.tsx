import { ArrowRight, Clock3, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { ProductImagePlaceholder } from '@/features/catalog/components/product-image-placeholder';
import type {
  HomepageOperationalState,
  HomepageProduct,
} from '@/server/queries/home';

type HomeHeroProps = {
  bakeryName: string;
  address: string;
  operational: HomepageOperationalState;
  heroProduct?: HomepageProduct;
};

export function HomeHero({
  bakeryName,
  address,
  operational,
  heroProduct,
}: HomeHeroProps) {
  return (
    <section className="overflow-hidden py-12 sm:py-16 lg:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase sm:text-sm">
            Sveže pečeno svakog dana
          </p>
          <h1 className="text-foreground mt-4 max-w-2xl text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {bakeryName}
          </h1>
          <p className="text-muted mt-5 max-w-xl text-lg leading-8">
            Poručite omiljene proizvode unapred i preuzmite ih u pekari bez
            čekanja.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/proizvodi"
              className="bg-primary hover:bg-primary-hover focus-visible:ring-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Pogledaj ponudu <ArrowRight aria-hidden size={18} />
            </Link>
            <Link
              href="#kako-funkcionise"
              className="border-border bg-surface hover:border-primary focus-visible:ring-primary inline-flex min-h-12 items-center justify-center rounded-xl border px-6 py-3 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Kako funkcioniše
            </Link>
          </div>

          <div className="border-border bg-surface mt-8 grid gap-4 rounded-2xl border p-5 shadow-sm sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 font-bold">
                <span
                  aria-hidden
                  className={`size-2.5 rounded-full ${operational.isOpen ? 'bg-emerald-600' : 'bg-red-600'}`}
                />
                {operational.isOpen
                  ? `Otvoreno${operational.closesAtLabel ? ` · do ${operational.closesAtLabel}` : ''}`
                  : `Zatvoreno${operational.opensAtNextLabel ? ` · otvara se ${operational.opensAtNextLabel}` : ''}`}
              </p>
              <p className="text-muted mt-1 text-sm">
                Danas {operational.todayHoursLabel}
              </p>
            </div>
            <div className="text-muted space-y-2 text-sm">
              <p className="flex gap-2">
                <Clock3
                  aria-hidden
                  className="text-primary shrink-0"
                  size={17}
                />
                <span>
                  Sledeći termin:{' '}
                  {operational.nextPickupLabel ?? 'Nema dostupnih termina'}
                </span>
              </p>
              <p className="flex gap-2">
                <MapPin
                  aria-hidden
                  className="text-primary shrink-0"
                  size={17}
                />
                <span>{address}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-border bg-surface-muted relative aspect-[4/3] overflow-hidden rounded-3xl border shadow-sm lg:aspect-[1/1.05]">
          {heroProduct?.imageUrl ? (
            <Image
              src={heroProduct.imageUrl}
              alt={heroProduct.name}
              fill
              priority
              sizes="(max-width: 1023px) calc(100vw - 2rem), 48vw"
              className="object-cover"
            />
          ) : (
            <ProductImagePlaceholder
              productName={heroProduct?.name ?? bakeryName}
            />
          )}
        </div>
      </div>
    </section>
  );
}

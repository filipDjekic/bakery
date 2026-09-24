import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { HomepageProduct } from '@/server/queries/home';

export function HomeCtaBanner({ product }: { product?: HomepageProduct }) {
  return (
    <section className="bg-primary relative mb-16 overflow-hidden rounded-3xl text-white shadow-sm lg:mb-24">
      <div
        className={`grid ${product?.imageUrl ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''}`}
      >
        <div className="relative z-10 p-7 sm:p-10 lg:p-14">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Spremni za svež doručak ili užinu?
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-orange-50">
            Poručite omiljene proizvode unapred i uživajte u svežini bez
            čekanja.
          </p>
          <Link
            href="/proizvodi"
            className="text-primary focus-visible:ring-surface focus-visible:ring-offset-primary mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Poruči odmah <ArrowRight aria-hidden size={18} />
          </Link>
        </div>
        {product?.imageUrl ? (
          <div className="relative min-h-64 lg:min-h-full">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 1023px) 100vw, 38vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

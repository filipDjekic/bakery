import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { ProductImagePlaceholder } from '@/features/catalog/components/product-image-placeholder';
import type { HomepageCategory } from '@/server/queries/home';

export function HomeCategories({
  categories,
}: {
  categories: HomepageCategory[];
}) {
  return (
    <section
      aria-labelledby="home-categories-heading"
      className="py-16 lg:py-24"
    >
      <h2
        id="home-categories-heading"
        className="text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Naše kategorije
      </h2>
      <p className="text-muted mt-3">
        Pronađite baš ono što vam se danas jede.
      </p>
      {categories.length ? (
        <div className="-mx-4 mt-8 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3 xl:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/proizvodi?category=${encodeURIComponent(category.slug)}`}
              className="border-border bg-surface group focus-visible:ring-primary min-w-[72vw] snap-start overflow-hidden rounded-2xl border shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none sm:min-w-0"
            >
              <div className="bg-surface-muted relative aspect-[4/3] overflow-hidden">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 72vw, (max-width: 1023px) 50vw, 17vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <ProductImagePlaceholder productName={category.name} />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <h3 className="font-bold">{category.name}</h3>
                <ArrowRight
                  aria-hidden
                  className="text-primary shrink-0"
                  size={18}
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted mt-8">Trenutno nema kategorija.</p>
      )}
    </section>
  );
}

import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { HomeFeaturedProducts } from '@/features/catalog/components/home-featured-products';
import { TodaysHours } from '@/features/settings/components/todays-hours';
import { getHomepageData } from '@/server/queries/home';

export default async function HomePage() {
  const { settings, categories, todayBusinessHours } = await getHomepageData();

  return (
    <>
      <section className="border-b border-zinc-200 bg-zinc-50">
        <Container>
          <div className="py-16 sm:py-20 lg:py-28">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
                Dobrodošli
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
                {settings.bakeryName}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
                Sveže pripremljeni pekarski proizvodi spremni za vaše
                preuzimanje.
              </p>

              <div className="mt-8">
                <Link
                  href="/proizvodi"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Pogledaj proizvode
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="bakery-information-heading"
        className="border-b border-zinc-200"
      >
        <Container>
          <div className="py-12 sm:py-16">
            <h2
              id="bakery-information-heading"
              className="text-2xl font-bold tracking-tight text-zinc-950"
            >
              Informacije o pekari
            </h2>

            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 p-5">
                <p className="text-sm font-medium text-zinc-500">Adresa</p>
                <p className="mt-2 font-medium text-zinc-950">
                  {settings.address}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 p-5">
                <p className="text-sm font-medium text-zinc-500">Telefon</p>
                <a
                  href={`tel:${settings.phone}`}
                  className="mt-2 inline-block font-medium text-zinc-950 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:outline-none"
                >
                  {settings.phone}
                </a>
              </div>

              <div className="rounded-lg border border-zinc-200 p-5">
                <p className="text-sm font-medium text-zinc-500">Danas</p>
                <TodaysHours intervals={todayBusinessHours} />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        <HomeFeaturedProducts categories={categories} />
      </Container>
    </>
  );
}

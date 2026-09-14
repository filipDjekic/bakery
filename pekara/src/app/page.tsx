import Link from "next/link";

import { Container } from "@/components/layout/container";
import { formatBusinessHours } from "@/lib/format-business-hours";
import { getHomepageData } from "@/server/queries/home";

export default async function HomePage() {
  const { settings, categories, todayBusinessHours } =
    await getHomepageData();

  const todayHours = formatBusinessHours(todayBusinessHours);
  const isClosedToday = todayBusinessHours.length === 0;

  return (
    <>
      <section className="border-b border-zinc-200 bg-zinc-50">
        <Container>
          <div className="py-16 sm:py-20 lg:py-28">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
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
                  href="/products"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
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
                <p className="text-sm font-medium text-zinc-500">
                  Adresa
                </p>

                <p className="mt-2 font-medium text-zinc-950">
                  {settings.address}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 p-5">
                <p className="text-sm font-medium text-zinc-500">
                  Telefon
                </p>

                <a
                  href={`tel:${settings.phone}`}
                  className="mt-2 inline-block font-medium text-zinc-950 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  {settings.phone}
                </a>
              </div>

              <div className="rounded-lg border border-zinc-200 p-5">
                <p className="text-sm font-medium text-zinc-500">
                  Danas
                </p>

                <p
                  className={`mt-2 font-medium ${
                    isClosedToday ? "text-zinc-600" : "text-zinc-950"
                  }`}
                >
                  {todayHours}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="categories-heading"
        className="py-12 sm:py-16 lg:py-20"
      >
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Ponuda
              </p>

              <h2
                id="categories-heading"
                className="mt-2 text-3xl font-bold tracking-tight text-zinc-950"
              >
                Naše kategorije
              </h2>
            </div>

            <Link
              href="/products"
              className="hidden text-sm font-semibold text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline sm:block"
            >
              Svi proizvodi
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href="/products"
                  className="group rounded-lg border border-zinc-200 p-6 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                >
                  <h3 className="text-lg font-semibold text-zinc-950">
                    {category.name}
                  </h3>

                  {category.description ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {category.description}
                    </p>
                  ) : null}

                  <span className="mt-5 inline-block text-sm font-semibold text-zinc-700 group-hover:text-zinc-950">
                    Pogledaj proizvode →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
              <p className="text-zinc-600">
                Trenutno nema dostupnih kategorija.
              </p>
            </div>
          )}

          <div className="mt-8 sm:hidden">
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-950"
            >
              Svi proizvodi
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

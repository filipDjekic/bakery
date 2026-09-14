import { Container } from "@/components/layout/container";

export default function ProductsPage() {
  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Proizvodi
          </h1>

          <p className="mt-4 text-zinc-600">
            Katalog proizvoda biće prikazan ovde.
          </p>
        </div>
      </Container>
    </section>
  );
}

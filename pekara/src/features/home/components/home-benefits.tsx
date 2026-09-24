import { Clock, ShoppingBag, Wheat } from 'lucide-react';

export function HomeBenefits({ bakeryName }: { bakeryName: string }) {
  const benefits = [
    {
      title: 'Sveže pečeno više puta dnevno',
      text: 'Ponuda pripremljena za svakodnevno uživanje.',
      icon: Wheat,
    },
    {
      title: 'Brzo online poručivanje',
      text: 'Od proizvoda do potvrde u nekoliko jednostavnih koraka.',
      icon: ShoppingBag,
    },
    {
      title: 'Preuzimanje bez čekanja',
      text: 'Izaberite termin koji vam odgovara.',
      icon: Clock,
    },
  ];
  return (
    <section aria-labelledby="benefits-heading" className="py-16 lg:py-24">
      <h2
        id="benefits-heading"
        className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Zašto odabrati {bakeryName}?
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {benefits.map(({ title, text, icon: Icon }) => (
          <article
            key={title}
            className="border-border bg-surface rounded-2xl border p-6 text-center shadow-sm"
          >
            <span className="bg-surface-muted text-primary mx-auto inline-flex size-14 items-center justify-center rounded-full">
              <Icon aria-hidden size={26} />
            </span>
            <h3 className="mt-5 text-lg font-bold">{title}</h3>
            <p className="text-muted mt-2 text-sm leading-6">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

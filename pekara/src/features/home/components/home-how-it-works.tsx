import { CalendarClock, CreditCard, ShoppingBasket, Store } from 'lucide-react';

const steps = [
  {
    title: 'Izaberite proizvode',
    description:
      'Pregledajte našu ponudu i dodajte omiljene proizvode u korpu.',
    icon: ShoppingBasket,
  },
  {
    title: 'Odaberite termin preuzimanja',
    description:
      'Izaberite željeni datum i vreme kada želite da preuzmete porudžbinu.',
    icon: CalendarClock,
  },
  {
    title: 'Preuzmite u pekari',
    description: 'Vaši proizvodi će vas čekati spremni, bez čekanja u redu.',
    icon: Store,
  },
] as const;

export function HomeHowItWorks() {
  return (
    <section
      id="kako-funkcionise"
      aria-labelledby="how-heading"
      className="scroll-mt-24 py-16 lg:py-24"
    >
      <div className="text-center">
        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
          Jednostavno i brzo
        </p>
        <h2
          id="how-heading"
          className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Kako funkcioniše
        </h2>
      </div>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map(({ title, description, icon: Icon }, index) => (
          <li
            key={title}
            className="border-border bg-surface relative rounded-2xl border p-6 shadow-sm"
          >
            <span className="bg-primary absolute top-5 right-5 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold text-white">
              {index + 1}
            </span>
            <span className="bg-surface-muted text-primary inline-flex size-14 items-center justify-center rounded-2xl">
              <Icon aria-hidden size={27} />
            </span>
            <h3 className="mt-5 text-xl font-bold">{title}</h3>
            <p className="text-muted mt-3 leading-7">{description}</p>
          </li>
        ))}
      </ol>
      <p className="border-border bg-surface-muted mt-6 flex items-center justify-center gap-3 rounded-xl border px-5 py-4 text-center font-semibold">
        <CreditCard aria-hidden className="text-primary" size={20} /> Plaćanje
        se vrši prilikom preuzimanja.
      </p>
    </section>
  );
}

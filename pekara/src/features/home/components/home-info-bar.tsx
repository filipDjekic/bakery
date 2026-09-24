import { Clock3, MapPin, PackageCheck, Phone } from 'lucide-react';

type HomeInfoBarProps = {
  address: string;
  phone: string;
  todayHoursLabel: string;
};

export function HomeInfoBar({
  address,
  phone,
  todayHoursLabel,
}: HomeInfoBarProps) {
  const cards = [
    { label: 'Adresa', value: address, icon: MapPin },
    { label: 'Telefon', value: phone, href: `tel:${phone}`, icon: Phone },
    { label: 'Radno vreme danas', value: todayHoursLabel, icon: Clock3 },
    {
      label: 'Preuzimanje',
      value: 'Poručite online, preuzmite bez čekanja',
      icon: PackageCheck,
    },
  ];

  return (
    <section
      aria-label="Informacije o pekari"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {cards.map(({ label, value, href, icon: Icon }) => (
        <article
          key={label}
          className="border-border bg-surface flex gap-4 rounded-2xl border p-5 shadow-sm"
        >
          <span className="bg-surface-muted text-primary inline-flex size-11 shrink-0 items-center justify-center rounded-full">
            <Icon aria-hidden size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-muted text-xs font-bold tracking-wide uppercase">
              {label}
            </h2>
            {href ? (
              <a
                href={href}
                className="hover:text-primary focus-visible:ring-primary mt-1 block font-semibold break-words hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {value}
              </a>
            ) : (
              <p className="mt-1 font-semibold break-words">{value}</p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

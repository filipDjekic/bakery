import { Clock3, MapPin, Phone, Wheat } from 'lucide-react';
import Link from 'next/link';

import { focusRingInsetClassName } from '@/components/ui/focus';
import { cn } from '@/lib/cn';
import { getPublicChromeSettings } from '@/server/queries/public-settings';

import { Container } from './container';
import { publicNavigation } from './public-nav';

const weekdayNames = [
  'Ponedeljak',
  'Utorak',
  'Sreda',
  'Četvrtak',
  'Petak',
  'Subota',
  'Nedelja',
];

function hoursLabel(
  intervals: { openMinute: number; closeMinute: number }[],
): string {
  if (intervals.length === 0) return 'Zatvoreno';
  const time = (minute: number) =>
    `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  return intervals
    .map(
      ({ openMinute, closeMinute }) =>
        `${time(openMinute)}–${time(closeMinute)}`,
    )
    .join(', ');
}

export async function PublicFooter() {
  const settings = await getPublicChromeSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer id="kontakt" className="border-border bg-surface border-t">
      <Container>
        <div className="grid gap-10 py-12 md:grid-cols-3 lg:py-16">
          <div>
            <Link
              href="/"
              className={cn(
                'inline-flex items-center gap-3 rounded-lg font-bold',
                focusRingInsetClassName,
              )}
            >
              <span className="bg-primary text-surface inline-flex size-10 items-center justify-center rounded-full">
                <Wheat aria-hidden size={21} />
              </span>
              {settings?.bakeryName ?? 'Pekara'}
            </Link>
            <p className="text-muted mt-4 max-w-sm text-sm leading-6">
              Sveži pekarski proizvodi koje možete poručiti unapred i preuzeti
              bez čekanja.
            </p>
          </div>

          {settings ? (
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase">
                Kontakt
              </h2>
              <ul className="text-muted mt-4 space-y-3 text-sm">
                <li className="flex gap-3">
                  <MapPin
                    aria-hidden
                    className="text-primary mt-0.5 shrink-0"
                    size={18}
                  />
                  {settings.address.trim() ? (
                    <a
                      className="hover:text-primary hover:underline"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {settings.address}
                    </a>
                  ) : null}
                </li>
                <li className="flex gap-3">
                  <Phone
                    aria-hidden
                    className="text-primary shrink-0"
                    size={18}
                  />
                  <a
                    className="hover:text-primary hover:underline"
                    href={`tel:${settings.phone}`}
                  >
                    {settings.phone}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Clock3
                    aria-hidden
                    className="text-primary shrink-0"
                    size={18}
                  />
                  <span>Danas: {settings.todayHoursLabel}</span>
                </li>
              </ul>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${settings.isOpen ? 'bg-emerald-600' : 'bg-red-600'}`}
                />
                {settings.isOpen ? 'Otvoreno' : 'Zatvoreno'}
              </p>
              <details className="mt-4 text-sm">
                <summary
                  className={cn(
                    'text-primary cursor-pointer rounded-sm font-semibold',
                    focusRingInsetClassName,
                  )}
                >
                  Pogledaj radno vreme
                </summary>
                <dl className="mt-3 grid gap-1.5">
                  {weekdayNames.map((day, index) => (
                    <div key={day} className="flex justify-between gap-4">
                      <dt>{day}</dt>
                      <dd className="text-right font-medium">
                        {hoursLabel(
                          settings.businessHours.filter(
                            (hours) => hours.weekday === index + 1,
                          ),
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          ) : null}

          <nav aria-label="Navigacija u podnožju">
            <h2 className="text-sm font-bold tracking-wide uppercase">
              Navigacija
            </h2>
            <ul className="mt-4 space-y-3">
              {publicNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className={cn(
                      'text-muted hover:text-primary rounded-sm text-sm font-medium',
                      focusRingInsetClassName,
                    )}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="border-border border-t py-5">
          <p className="text-muted text-sm">
            © {currentYear} {settings?.bakeryName ?? 'Pekara'}. Sva prava
            zadržana.
          </p>
        </div>
      </Container>
    </footer>
  );
}

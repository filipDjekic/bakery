import Link from 'next/link';

import { getPublicChromeSettings } from '@/server/queries/public-settings';

import { Container } from './container';

export async function PublicFooter() {
  const settings = await getPublicChromeSettings();

  return (
    <footer className="border-t border-border bg-surface">
      <Container>
        <div className="grid gap-8 py-10 sm:grid-cols-2">
          <div>
            <Link
              href="/"
              className="font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:outline-none"
            >
              {settings?.bakeryName ?? 'Pekara'}
            </Link>

            {settings ? (
              <div className="mt-3 space-y-1 text-sm text-muted">
                <p>{settings.address}</p>

                <p>
                  <a
                    href={`tel:${settings.phone}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {settings.phone}
                  </a>
                </p>
              </div>
            ) : null}
          </div>

          <nav aria-label="Navigacija u podnožju" className="sm:text-right">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted hover:text-foreground"
                >
                  Početna
                </Link>
              </li>

              <li>
                <Link
                  href="/proizvodi"
                  className="text-sm text-muted hover:text-foreground"
                >
                  Proizvodi
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-border py-5">
          <p className="text-sm text-zinc-500">
            © {settings?.currentYear} {settings?.bakeryName ?? 'Pekara'}. Sva
            prava zadržana.
          </p>
        </div>
      </Container>
    </footer>
  );
}

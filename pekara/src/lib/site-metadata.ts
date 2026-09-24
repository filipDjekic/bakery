import type { Metadata } from 'next';

export type PublicBrandSettings = { bakeryName: string; address: string };

export function siteDescription(settings?: PublicBrandSettings | null): string {
  return settings
    ? `Sveži pekarski proizvodi pekare ${settings.bakeryName}. Poručite online za preuzimanje na adresi ${settings.address}.`
    : 'Online poručivanje svežih pekarskih proizvoda.';
}

export function buildRootMetadata(
  settings: PublicBrandSettings | null,
  baseUrl: URL,
): Metadata {
  const name = settings?.bakeryName.trim() || 'Pekara';
  const description = siteDescription(settings);
  return {
    metadataBase: baseUrl,
    applicationName: name,
    title: { default: name, template: `%s | ${name}` },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'sr_RS',
      url: '/',
      siteName: name,
      title: name,
      description,
    },
  };
}

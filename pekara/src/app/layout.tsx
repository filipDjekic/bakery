import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  applicationName: 'Pekara',
  title: { default: 'Pekara', template: '%s | Pekara' },
  description: 'Online poručivanje svežih pekarskih proizvoda.',
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    siteName: 'Pekara',
    title: 'Pekara',
    description: 'Online poručivanje svežih pekarskih proizvoda.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sr-Latn">
      <body className="min-h-screen bg-white text-zinc-950 antialiased">{children}</body>
    </html>
  );
}

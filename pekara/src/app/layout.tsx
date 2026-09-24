import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { buildRootMetadata } from '@/lib/site-metadata';
import { getPublicChromeContent } from '@/server/queries/public-settings';

import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicChromeContent();
  return buildRootMetadata(
    settings,
    new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sr-Latn">
      <body className="bg-background text-foreground min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

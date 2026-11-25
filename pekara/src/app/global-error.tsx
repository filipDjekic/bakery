'use client';
import { useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true')
      captureException(error, { tags: { boundary: 'global' } });
  }, [error]);
  return (
    <html lang="sr-Latn">
      <body
        style={{
          fontFamily: 'Arial, sans-serif',
          padding: '2rem',
          color: '#2b1d14',
          background: '#fffaf3',
        }}
      >
        <main>
          <h1>Stranica trenutno nije dostupna</h1>
          <p>Pokušajte ponovo.</p>
          <button
            onClick={retry}
            style={{ minHeight: 44, padding: '0.75rem 1rem' }}
          >
            Pokušaj ponovo
          </button>
        </main>
      </body>
    </html>
  );
}

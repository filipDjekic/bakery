'use client';

import { Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyOrderNumber({ orderNumber }: { orderNumber: string }) {
  const [message, setMessage] = useState('');

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(orderNumber);
      setMessage('Broj porudžbine je kopiran.');
    } catch {
      setMessage('Kopiranje nije uspelo. Označite i kopirajte broj ručno.');
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void copy()}
        className="border-border bg-surface hover:border-primary focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
      >
        <Copy aria-hidden size={17} />
        Kopiraj broj
      </button>
      <p
        role="status"
        aria-live="polite"
        className="text-muted mt-2 min-h-5 text-sm"
      >
        {message}
      </p>
    </div>
  );
}

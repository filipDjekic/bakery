'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function ManualRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="border-border bg-surface hover:bg-surface-muted focus-visible:ring-primary min-h-10 rounded-md border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
    >
      {isPending ? 'Osvežavanje…' : 'Osveži'}
    </button>
  );
}

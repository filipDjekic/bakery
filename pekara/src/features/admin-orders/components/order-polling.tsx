'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const POLLING_INTERVAL_MS = 15_000;

export function OrderPolling() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}

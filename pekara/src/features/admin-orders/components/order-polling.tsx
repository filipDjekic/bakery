'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

export function OrderPolling({
  refreshedAt,
  timezone = 'Europe/Belgrade',
}: {
  refreshedAt?: string;
  timezone?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [offline, setOffline] = useState(false);
  const [stale, setStale] = useState(false);
  const inflight = useRef(false);
  const lastData = useRef(refreshedAt);
  const refresh = useCallback(() => {
    if (inflight.current || document.visibilityState !== 'visible') return;
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }
    setOffline(false);
    inflight.current = true;
    startTransition(() => router.refresh());
  }, [router]);
  useEffect(() => {
    if (!pending) inflight.current = false;
  }, [pending]);
  useEffect(() => {
    lastData.current = refreshedAt;
  }, [refreshedAt]);
  useEffect(() => {
    function tick() {
      setStale(
        lastData.current
          ? Date.now() - Date.parse(lastData.current) > 45_000
          : false,
      );
      const active = document.activeElement;
      if (
        document.querySelector('dialog[open]') ||
        active?.matches('input, textarea, select')
      )
        return;
      refresh();
    }
    function network() {
      setOffline(!navigator.onLine);
      if (navigator.onLine) tick();
    }
    const interval = window.setInterval(tick, 15_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
    };
  }, [refresh]);
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={pending || offline}
        onClick={refresh}
      >
        {pending ? 'Osvežavanje…' : 'Osveži'}
      </Button>
      <p
        role="status"
        className={
          offline || stale ? 'text-sm text-red-800' : 'text-muted text-sm'
        }
      >
        {offline
          ? 'Veza je prekinuta. Podaci možda nisu aktuelni.'
          : stale
            ? 'Podaci nisu osveženi. Pokušajte ručno.'
            : refreshedAt
              ? `Podaci učitani u ${new Date(refreshedAt).toLocaleTimeString('sr-Latn-RS', { timeZone: timezone })}. Automatsko osvežavanje: 15 s.`
              : 'Automatsko osvežavanje: 15 s.'}
      </p>
    </div>
  );
}

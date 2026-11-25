'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react';
import {
  dismissToast,
  toast,
  TOAST_DURATION,
  useToastStore,
  type ToastMessage,
} from '@/lib/toast';
const styles = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  error: 'border-red-300 bg-red-50 text-red-950',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  info: 'border-blue-300 bg-blue-50 text-blue-950',
};
const icons = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};
function ToastItem({ item }: { item: ToastMessage }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pause = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const resume = () => {
    pause();
    timer.current = setTimeout(() => dismissToast(item.id), TOAST_DURATION);
  };
  useEffect(() => {
    timer.current = setTimeout(() => dismissToast(item.id), TOAST_DURATION);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [item.id]);
  const Icon = icons[item.type];
  return (
    <li
      data-toast-type={item.type}
      data-closing={item.closing || undefined}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className={`app-toast pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg ${styles[item.type]}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p
        role={item.type === 'error' ? 'alert' : 'status'}
        className="flex-1 text-sm font-medium"
      >
        {item.message}
      </p>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        aria-label="Zatvori obaveštenje"
        className="-m-2 grid size-10 shrink-0 place-items-center rounded-lg focus-visible:outline-2"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}
export function ToastProvider() {
  const pathname = usePathname();
  useEffect(() => {
    const notice = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('bakery-notice='));
    if (!notice) return;
    document.cookie = 'bakery-notice=; Max-Age=0; Path=/; SameSite=Lax';
    try {
      toast.success(
        decodeURIComponent(notice.slice('bakery-notice='.length)).slice(0, 200),
      );
    } catch {
      /* Ignore malformed UI-only cookies. */
    }
  }, [pathname]);
  const messages = useToastStore((state) => state.messages);
  return (
    <ol
      aria-label="Obaveštenja"
      className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex max-h-[85dvh] flex-col gap-3 overflow-y-auto p-1 sm:inset-x-auto sm:top-5 sm:right-5 sm:w-96"
    >
      {messages.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </ol>
  );
}

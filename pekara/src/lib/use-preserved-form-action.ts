'use client';
import {
  useActionState,
  useEffect,
  useRef,
  useTransition,
  type FormEvent,
} from 'react';
import { toast } from './toast';
export function usePreservedFormAction<State>(
  action: (state: Awaited<State>, data: FormData) => State | Promise<State>,
  initial: Awaited<State>,
  successMessage?: string,
) {
  const submitting = useRef(false);
  const [state, dispatch, pending] = useActionState(
    async (previous: Awaited<State>, data: FormData) => {
      try {
        return await action(previous, data);
      } finally {
        submitting.current = false;
      }
    },
    initial,
  );
  const notified = useRef<unknown>(initial);
  useEffect(() => {
    if (state === notified.current) return;
    notified.current = state;
    if (!state || typeof state !== 'object') return;
    const result = state as {
      status?: string;
      message?: string;
      success?: string;
      error?: string;
    };
    if (result.status === 'error' || result.error)
      toast.error(result.message ?? result.error ?? 'Promena nije sačuvana.');
    else if (result.status === 'success' || result.success)
      toast.success(
        successMessage ??
          result.message ??
          result.success ??
          'Promena je sačuvana.',
      );
  }, [state, successMessage]);
  const [, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }
  return [state, submit, pending] as const;
}

'use client';
import { useActionState, useTransition, type FormEvent } from 'react';
export function usePreservedFormAction<State>(
  action: (state: Awaited<State>, data: FormData) => State | Promise<State>,
  initial: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const [, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }
  return [state, submit, pending] as const;
}

'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { authClient } from '@/server/auth/auth-client';

export function LoginForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setErrorMessage(
          result.error.status === 429
            ? 'Previše pokušaja. Sačekajte minut i pokušajte ponovo.'
            : 'Email ili lozinka nisu ispravni.',
        );
        return;
      }

      router.replace('/admin');
      router.refresh();
    } catch {
      setErrorMessage('Prijava trenutno nije dostupna. Pokušajte ponovo.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={isPending}
          className="border-border bg-surface text-foreground focus-visible:ring-primary mt-2 min-h-11 w-full rounded-md border px-3 py-2 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="text-foreground text-sm font-medium"
        >
          Lozinka
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="border-border bg-surface text-foreground focus-visible:ring-primary mt-2 min-h-11 w-full rounded-md border px-3 py-2 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        />
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary hover:bg-primary-hover focus-visible:ring-primary min-h-11 w-full rounded-md px-4 py-2 font-semibold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Prijavljivanje…' : 'Prijavi se'}
      </button>
    </form>
  );
}

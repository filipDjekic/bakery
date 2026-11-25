'use client';

import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        toast.error('Prijava nije uspela. Proverite podatke.');
        setErrorMessage(
          result.error.status === 429
            ? 'Previše pokušaja. Sačekajte minut i pokušajte ponovo.'
            : 'Email ili lozinka nisu ispravni.',
        );
        return;
      }

      toast.success('Prijava je uspela.');
      router.replace('/admin');
      router.refresh();
    } catch {
      toast.error('Prijava trenutno nije dostupna.');
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
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={isPending}
          className="mt-2"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="text-foreground text-sm font-medium"
        >
          Lozinka
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="mt-2"
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

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Prijavljivanje…' : 'Prijavi se'}
      </Button>
    </form>
  );
}

import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { LoginForm } from '@/features/admin-auth/components/login-form';
import { getCurrentUser } from '@/server/auth/current-user';

export const instant = false;

export default async function AdminLoginPage() {
  await connection();
  const user = await getCurrentUser();

  if (user) {
    redirect('/admin');
  }

  return (
    <main className="bg-surface-muted flex min-h-screen items-center justify-center px-4 py-12">
      <section className="border-border bg-surface w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
        <p className="text-primary text-sm font-semibold tracking-wider uppercase">
          Pekara Admin
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-bold">
          Prijava zaposlenih
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">
          Pristup je dozvoljen samo aktivnim nalozima zaposlenih.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}

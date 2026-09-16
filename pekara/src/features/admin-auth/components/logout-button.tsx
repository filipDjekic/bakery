'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/server/auth/auth-client';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function logout() {
    setIsPending(true);

    try {
      await authClient.signOut();
      router.replace('/admin/login');
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isPending}
      className="border-border hover:bg-surface-muted focus-visible:ring-primary min-h-10 rounded-md border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
    >
      {isPending ? 'Odjavljivanje…' : 'Odjavi se'}
    </button>
  );
}

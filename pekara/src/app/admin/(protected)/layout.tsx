import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import {
  AuthenticationRequiredError,
  requireStaff,
} from '@/server/auth/authorization';

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  let user;

  try {
    user = await requireStaff();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect('/admin/login');
    }

    throw error;
  }

  return (
    <div className="bg-surface-muted flex min-h-screen">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <AdminHeader user={user} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

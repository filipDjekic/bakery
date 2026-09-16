import type { CurrentUser } from '@/server/auth/current-user';

import { LogoutButton } from '../../features/admin-auth/components/logout-button';
import { AdminMobileNav } from './admin-mobile-nav';

type AdminHeaderProps = {
  user: CurrentUser;
};

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="border-border bg-surface relative flex min-h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <AdminMobileNav />
        <div>
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-muted text-xs">
            {user.role === 'ADMIN' ? 'Administrator' : 'Zaposleni'}
          </p>
        </div>
      </div>
      <LogoutButton />
    </header>
  );
}

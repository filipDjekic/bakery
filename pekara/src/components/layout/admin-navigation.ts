import type { CurrentUser } from '@/server/auth/current-user';

export type AdminNavigationItem = {
  label: string;
  href: string;
  roles: readonly CurrentUser['role'][];
};

export const adminNavigation: readonly AdminNavigationItem[] = [
  { label: 'Početna', href: '/admin', roles: ['ADMIN', 'STAFF'] },
  { label: 'Porudžbine', href: '/admin/orders', roles: ['ADMIN', 'STAFF'] },
  { label: 'Proizvodi', href: '/admin/products', roles: ['ADMIN'] },
  { label: 'Kategorije', href: '/admin/categories', roles: ['ADMIN'] },
  { label: 'Podešavanja', href: '/admin/settings', roles: ['ADMIN'] },
];

export function getAdminNavigationForRole(
  role: CurrentUser['role'],
): AdminNavigationItem[] {
  return adminNavigation.filter((item) => item.roles.includes(role));
}

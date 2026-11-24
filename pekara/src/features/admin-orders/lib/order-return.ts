export function safeOrderReturn(value: string | undefined): string {
  if (!value || !value.startsWith('/admin/orders?'))
    return '/admin/orders?view=all';
  const url = new URL(value, 'https://local.test');
  if (url.pathname !== '/admin/orders') return '/admin/orders?view=all';
  const params = new URLSearchParams();
  for (const key of ['view', 'page', 'status', 'from', 'to']) {
    const entry = url.searchParams.get(key);
    if (entry) params.set(key, entry.slice(0, 40));
  }
  return `/admin/orders?${params}`;
}

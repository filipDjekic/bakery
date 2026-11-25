export function safeOrderReturn(value: string | undefined): string {
  if (
    !value ||
    !(value.startsWith('/admin/orders?') || value.startsWith('/admin?'))
  )
    return '/admin/orders?view=all';
  const url = new URL(value, 'https://local.test');
  if (!['/admin/orders', '/admin'].includes(url.pathname))
    return '/admin/orders?view=all';
  const params = new URLSearchParams();
  for (const key of ['view', 'page', 'status', 'from', 'to', 'q']) {
    const entry = url.searchParams.get(key);
    if (entry) params.set(key, entry.slice(0, key === 'q' ? 120 : 40));
  }
  return `${url.pathname}?${params}`;
}

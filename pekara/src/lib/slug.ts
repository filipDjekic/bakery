export function normalizeSlug(value: string): string {
  return value
    .replace(/[đĐ]/g, 'dj')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
export function slugCandidate(
  name: string,
  maximum: number,
  attempt = 0,
): string {
  const suffix = attempt ? `-${attempt + 1}` : '';
  return (
    normalizeSlug(name)
      .slice(0, maximum - suffix.length)
      .replace(/-+$/g, '') + suffix
  );
}

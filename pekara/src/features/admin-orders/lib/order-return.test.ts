import { expect, it } from 'vitest';
import { safeOrderReturn } from './order-return';
it('preserves only local order filter context and rejects external return targets', () => {
  expect(
    safeOrderReturn(
      '/admin/orders?view=all&page=3&status=NEW&redirect=https://evil.test',
    ),
  ).toBe('/admin/orders?view=all&page=3&status=NEW');
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/admin/orders/other?view=all',
    undefined,
  ])
    expect(safeOrderReturn(value)).toBe('/admin/orders?view=all');
});

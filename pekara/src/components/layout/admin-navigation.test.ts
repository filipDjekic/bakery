import { describe, expect, it } from 'vitest';

import { getAdminNavigationForRole } from './admin-navigation';

describe('getAdminNavigationForRole', () => {
  it('returns every admin section for ADMIN', () => {
    expect(getAdminNavigationForRole('ADMIN').map((item) => item.href)).toEqual(
      [
        '/admin',
        '/admin/orders',
        '/admin/products',
        '/admin/categories',
        '/admin/settings',
      ],
    );
  });

  it('returns only operational sections for STAFF', () => {
    expect(getAdminNavigationForRole('STAFF').map((item) => item.href)).toEqual(
      ['/admin', '/admin/orders'],
    );
  });
});

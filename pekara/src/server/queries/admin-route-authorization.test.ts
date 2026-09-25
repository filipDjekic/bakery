import { describe, expect, it } from 'vitest';

import { AuthorizationDeniedError, requireAdmin } from '../auth/authorization';
import type { CurrentUser } from '../auth/current-user';
import { getAdminCategories } from './admin-categories';
import { getAdminProducts } from './admin-products';
import { getAdminSettings } from './admin-settings';

const staff: CurrentUser = {
  id: 'staff',
  name: 'Staff',
  email: 'staff@example.test',
  role: 'STAFF',
};

describe('admin-only route query boundaries', () => {
  it.each([
    ['products', getAdminProducts],
    ['categories', getAdminCategories],
    ['settings', getAdminSettings],
  ] as const)('denies STAFF before reading %s data', async (_name, query) => {
    await expect(
      query(() => requireAdmin(async () => staff)),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });
});

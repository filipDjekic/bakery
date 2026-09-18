import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requireAdmin,
  requireStaff,
} from '../../src/server/auth/authorization.ts';
import type { CurrentUser } from '../../src/server/auth/current-user.ts';
import { storeProductImage } from '../../src/server/images/upload-product-image.ts';
import { createProduct } from '../../src/server/services/create-product.ts';
import { createCategory } from '../../src/server/services/categories.ts';
import {
  updateBakeryProfile,
  updateOrderSettings,
} from '../../src/server/services/settings.ts';
import { updateWorkingHours } from '../../src/server/services/update-working-hours.ts';

const staff: CurrentUser = {
  id: 'staff',
  name: 'Staff',
  email: 'staff@example.test',
  role: 'STAFF',
};
const admin: CurrentUser = {
  id: 'admin',
  name: 'Admin',
  email: 'admin@example.test',
  role: 'ADMIN',
};
type Authorize = () => Promise<unknown>;

const mutationBoundaries: Array<{
  name: string;
  invoke: (authorize: Authorize) => Promise<unknown>;
}> = [
  {
    name: 'create product',
    invoke: (authorize) =>
      createProduct(
        {
          name: '',
          slug: '',
          description: '',
          priceMinor: -1,
          categoryId: '',
          sortOrder: 0,
          isActive: false,
          isAvailable: false,
          image: null,
        },
        { authorize },
      ),
  },
  {
    name: 'create category',
    invoke: (authorize) =>
      createCategory(
        { name: '', slug: '', description: '', sortOrder: 0, isActive: false },
        authorize,
      ),
  },
  {
    name: 'update bakery profile',
    invoke: (authorize) =>
      updateBakeryProfile(
        {
          bakeryName: '',
          phone: '',
          address: '',
          notificationEmail: '',
          expectedUpdatedAt: '',
        },
        authorize,
      ),
  },
  {
    name: 'update order settings',
    invoke: (authorize) =>
      updateOrderSettings(
        {
          orderAcceptingEnabled: false,
          minimumPreparationMinutes: -1,
          maximumAdvanceDays: -1,
          pickupSlotMinutes: 25,
          expectedUpdatedAt: '',
        },
        authorize,
      ),
  },
  {
    name: 'update working hours',
    invoke: (authorize) =>
      updateWorkingHours(
        [{ weekday: 1, openMinute: 600, closeMinute: 500 }],
        authorize,
      ),
  },
  {
    name: 'upload product image',
    invoke: (authorize) =>
      storeProductImage(new File([], 'empty.png', { type: 'image/png' }), {
        authorize,
      }),
  },
];

test('anonymous and STAFF users fail every direct admin mutation boundary before validation or writes', async () => {
  for (const boundary of mutationBoundaries) {
    await assert.rejects(
      boundary.invoke(() => requireAdmin(async () => null)),
      AuthenticationRequiredError,
      `${boundary.name}: anonymous`,
    );
    await assert.rejects(
      boundary.invoke(() => requireAdmin(async () => staff)),
      AuthorizationDeniedError,
      `${boundary.name}: staff`,
    );
  }
});

test('ADMIN passes authorization and reaches each mutation validation boundary', async () => {
  for (const boundary of mutationBoundaries) {
    await assert.rejects(
      boundary.invoke(() => requireAdmin(async () => admin)),
      (error: unknown) => {
        assert.equal(
          error instanceof AuthenticationRequiredError,
          false,
          boundary.name,
        );
        assert.equal(
          error instanceof AuthorizationDeniedError,
          false,
          boundary.name,
        );
        return true;
      },
    );
  }
});

test('STAFF remains allowed at staff boundary while ADMIN is allowed at both levels', async () => {
  assert.equal((await requireStaff(async () => staff)).role, 'STAFF');
  assert.equal((await requireStaff(async () => admin)).role, 'ADMIN');
  assert.equal((await requireAdmin(async () => admin)).role, 'ADMIN');
  await assert.rejects(
    requireAdmin(async () => staff),
    AuthorizationDeniedError,
  );
});

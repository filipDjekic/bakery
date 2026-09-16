import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requireAdmin,
  requireAuthenticatedUser,
  requireStaff,
} from '../../src/server/auth/authorization.ts';
import { getCurrentUser } from '../../src/server/auth/current-user.ts';
import type { CurrentUser } from '../../src/server/auth/current-user.ts';

const staff: CurrentUser = {
  id: 'staff-id',
  name: 'Staff User',
  email: 'staff@example.test',
  role: 'STAFF',
};

const admin: CurrentUser = {
  id: 'admin-id',
  name: 'Admin User',
  email: 'admin@example.test',
  role: 'ADMIN',
};

test('anonymous requests fail every privileged boundary', async () => {
  const anonymous = async () => null;

  await assert.rejects(
    requireAuthenticatedUser(anonymous),
    AuthenticationRequiredError,
  );
  await assert.rejects(requireStaff(anonymous), AuthenticationRequiredError);
  await assert.rejects(requireAdmin(anonymous), AuthenticationRequiredError);
});

test('STAFF can use staff operations but not admin-only operations', async () => {
  const currentStaff = async () => staff;

  assert.deepEqual(await requireStaff(currentStaff), staff);
  await assert.rejects(requireAdmin(currentStaff), AuthorizationDeniedError);
});

test('ADMIN can use both staff and admin operations', async () => {
  const currentAdmin = async () => admin;

  assert.deepEqual(await requireStaff(currentAdmin), admin);
  assert.deepEqual(await requireAdmin(currentAdmin), admin);
});

test('deleted and disabled session users resolve to anonymous', async () => {
  const deleted = await getCurrentUser({
    getSession: async () => ({ user: { id: 'deleted' } }),
    findUser: async () => null,
  });
  const disabled = await getCurrentUser({
    getSession: async () => ({ user: { id: 'disabled' } }),
    findUser: async () => ({ ...staff, isActive: false }),
  });

  assert.equal(deleted, null);
  assert.equal(disabled, null);
});

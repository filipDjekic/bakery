import 'server-only';

import { getCurrentUser, type CurrentUser } from './current-user.ts';

export class AuthenticationRequiredError extends Error {
  readonly status = 401;

  constructor() {
    super('Authentication is required.');
    this.name = 'AuthenticationRequiredError';
  }
}

export class AuthorizationDeniedError extends Error {
  readonly status = 403;

  constructor() {
    super('You do not have permission to perform this operation.');
    this.name = 'AuthorizationDeniedError';
  }
}

type CurrentUserProvider = () => Promise<CurrentUser | null>;

export async function requireAuthenticatedUser(
  currentUserProvider: CurrentUserProvider = getCurrentUser,
): Promise<CurrentUser> {
  const user = await currentUserProvider();

  if (!user) {
    throw new AuthenticationRequiredError();
  }

  return user;
}

export async function requireStaff(
  currentUserProvider: CurrentUserProvider = getCurrentUser,
): Promise<CurrentUser> {
  const user = await requireAuthenticatedUser(currentUserProvider);

  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    throw new AuthorizationDeniedError();
  }

  return user;
}

export async function requireAdmin(
  currentUserProvider: CurrentUserProvider = getCurrentUser,
): Promise<CurrentUser> {
  const user = await requireAuthenticatedUser(currentUserProvider);

  if (user.role !== 'ADMIN') {
    throw new AuthorizationDeniedError();
  }

  return user;
}

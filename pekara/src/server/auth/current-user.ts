import 'server-only';

import { headers } from 'next/headers.js';
import { auth } from './auth.ts';
import { authPrisma } from './prisma.ts';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: 'STAFF' | 'ADMIN';
};

type CurrentUserDependencies = {
  getSession: () => Promise<{ user: { id: string } } | null>;
  findUser: (id: string) => Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null>;
};

const defaultDependencies: CurrentUserDependencies = {
  getSession: async () => auth.api.getSession({ headers: await headers() }),
  findUser: (id) =>
    authPrisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
};

export async function getCurrentUser(
  dependencies: CurrentUserDependencies = defaultDependencies,
): Promise<CurrentUser | null> {
  const session = await dependencies.getSession();

  if (!session) {
    return null;
  }

  const user = await dependencies.findUser(session.user.id);

  if (!user?.isActive) {
    return null;
  }

  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

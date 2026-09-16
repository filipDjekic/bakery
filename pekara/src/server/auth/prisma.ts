import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.ts';

const globalForAuthPrisma = globalThis as unknown as {
  authPrisma?: PrismaClient;
};

function createAuthPrisma(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export const authPrisma = globalForAuthPrisma.authPrisma ?? createAuthPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForAuthPrisma.authPrisma = authPrisma;
}

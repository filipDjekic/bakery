import 'server-only';
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

function createDatabase() { return postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
  poolOptions: { connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 },
}); }
const globalForBakery = globalThis as typeof globalThis & { bakeryDatabase?: ReturnType<typeof createDatabase> };
export const db = globalForBakery.bakeryDatabase ?? createDatabase();
if (process.env.NODE_ENV === 'development') globalForBakery.bakeryDatabase = db;

export type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DatabaseReader = Pick<typeof db, 'orm'>;

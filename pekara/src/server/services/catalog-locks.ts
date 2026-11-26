import 'server-only';
import { db, type DatabaseTransaction } from '../../prisma/db.ts';
import { z } from 'zod';

// Accept both canonical browser ISO versions and PostgreSQL timestamptz strings.
export const catalogVersionSchema = z
  .string()
  .min(20)
  .refine((value) => Number.isFinite(Date.parse(value)));

/** Category locks precede product locks, matching checkout's lock order. */
export async function lockProductCategories(
  tx: DatabaseTransaction,
  categoryIds: string[],
) {
  await tx.query(
    db.raw.sql`SELECT "id" FROM "public"."category"
    WHERE "id" IN (SELECT jsonb_array_elements_text(${JSON.stringify(categoryIds)}::jsonb)::uuid)
    ORDER BY "id" FOR SHARE`
      .returnsRow({ id: db.sql.public.category.columns.id })
      .build(),
  );
}

export function nextCatalogVersion(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

import 'server-only';

import { db, type DatabaseTransaction } from '../../prisma/db.ts';

/** Checkout linearizes at these shared row locks. Admin writes wait until the
 * order commits; checkout waits for earlier writes, then reads their new values.
 * Working-hours mutations must lock/version the parent settings row first. */
export async function lockOrderInputs(
  tx: DatabaseTransaction,
  productIds: string[],
) {
  await tx.query(
    db.raw.sql`
    SELECT "id" FROM "public"."bakerySettings"
    WHERE "id" = 'default' FOR SHARE
  `
      .returnsRow({ id: db.sql.public.bakerySettings.columns.id })
      .build(),
  );
  await tx.query(
    db.raw.sql`
    SELECT p."id" FROM "public"."product" p
    JOIN "public"."category" c ON c."id" = p."categoryId"
    WHERE p."id" IN (SELECT jsonb_array_elements_text(${JSON.stringify(productIds)}::jsonb)::uuid)
    ORDER BY c."id", p."id" FOR SHARE OF p, c
  `
      .returnsRow({ id: db.sql.public.product.columns.id })
      .build(),
  );
}

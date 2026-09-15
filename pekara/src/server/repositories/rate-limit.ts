import 'server-only';

import { db } from '../../prisma/db.ts';

export type RateLimitBucket = {
  count: number;
  expiresAt: string;
};

type IncrementRateLimitBucketInput = {
  keyHash: string;
  action: string;
  windowStart: string;
  windowSeconds: number;
  expiresAt: string;
};

export async function incrementRateLimitBucket({
  keyHash,
  action,
  windowStart,
  windowSeconds,
  expiresAt,
}: IncrementRateLimitBucketInput): Promise<RateLimitBucket> {
  const table = db.sql.public.actionRateLimitBucket;
  const plan = db.raw.sql`
    INSERT INTO "public"."actionRateLimitBucket"
      ("id", "keyHash", "action", "windowStart", "windowSeconds", "count", "expiresAt")
    VALUES
      (${crypto.randomUUID()}, ${keyHash}, ${action}, ${windowStart}::timestamptz, ${windowSeconds}, 1, ${expiresAt}::timestamptz)
    ON CONFLICT ("keyHash", "action", "windowStart", "windowSeconds")
    DO UPDATE SET
      "count" = "actionRateLimitBucket"."count" + 1,
      "expiresAt" = EXCLUDED."expiresAt"
    RETURNING "count", "expiresAt"
  `
    .returnsRow({
      count: table.columns.count,
      expiresAt: table.columns.expiresAt,
    })
    .build();
  const rows = await db.runtime().query(plan);
  const bucket = rows[0];

  if (!bucket) {
    throw new Error('Rate-limit bucket increment returned no row.');
  }

  return bucket;
}

export async function deleteExpiredRateLimitBuckets(
  now: string,
): Promise<void> {
  await db.orm.public.ActionRateLimitBucket.where((bucket) =>
    bucket.expiresAt.lte(now),
  ).deleteAll();
}

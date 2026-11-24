import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const predicates: Record<string, string> = {
  product: '"priceMinor" < 0 OR "imageWidth" <= 0 OR "imageHeight" <= 0',
  order: '"subtotalMinor" < 0 OR "totalMinor" < 0',
  orderItem:
    'quantity <= 0 OR "unitPriceMinor" < 0 OR "subtotalMinor" < 0 OR "subtotalMinor"::bigint <> "unitPriceMinor"::bigint * quantity::bigint',
  businessHours:
    'weekday NOT BETWEEN 1 AND 7 OR "openMinute" < 0 OR "closeMinute" > 1440 OR "openMinute" >= "closeMinute"',
  bakerySettings:
    '"minimumPreparationMinutes" NOT BETWEEN 0 AND 240 OR "maximumAdvanceDays" NOT BETWEEN 0 AND 30 OR "pickupSlotMinutes" NOT IN (5,10,15,20,30,60)',
  actionRateLimitBucket: 'count < 0 OR "windowSeconds" <= 0',
};
try {
  await pool.query('BEGIN READ ONLY');
  let invalid = 0;
  for (const [table, predicate] of Object.entries(predicates)) {
    const result = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM "${table}" WHERE ${predicate}`,
    );
    const count = Number(result.rows[0]?.count ?? 0);
    invalid += count;
    console.info(`${table}: ${count} incompatible rows`);
  }
  await pool.query('ROLLBACK');
  if (invalid)
    throw new Error(
      'Existing rows require operator-reviewed correction before migration.',
    );
} finally {
  await pool.end();
}

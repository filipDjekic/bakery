import pg from 'pg';
import { env, save, stats, agent } from './common.mjs';
const client = new pg.Client({ connectionString: env.DATABASE_URL });
const started = performance.now();
await client.connect();
const connectMs = performance.now() - started;
const queries = {
  'orders-first-page':
    'SELECT id, "orderNumber", status, "customerName", "pickupAt", "totalMinor", "currencyCode", "createdAt" FROM "order" ORDER BY "createdAt" DESC, id DESC LIMIT 25',
  'orders-last-page':
    'SELECT id, "orderNumber", status, "customerName", "pickupAt", "totalMinor", "currencyCode", "createdAt" FROM "order" ORDER BY "createdAt" DESC, id DESC LIMIT 25 OFFSET 9975',
  'orders-status':
    'SELECT id FROM "order" WHERE status=\'NEW\' ORDER BY "createdAt" DESC,id DESC LIMIT 25',
  'orders-date':
    'SELECT id FROM "order" WHERE "createdAt">=CURRENT_DATE-INTERVAL \'7 days\' AND "createdAt"<CURRENT_DATE+INTERVAL \'1 day\' ORDER BY "createdAt" DESC,id DESC LIMIT 25',
  'dashboard-count': 'SELECT count(*)::int FROM "order" WHERE status=\'NEW\'',
  'dashboard-completed':
    'SELECT count(*)::int, sum("totalMinor") FROM "order" WHERE status=\'COMPLETED\' AND "updatedAt">=CURRENT_DATE AND "updatedAt"<CURRENT_DATE+INTERVAL \'1 day\'',
  catalog:
    'SELECT id,name,slug,"priceMinor" FROM product WHERE "isActive" ORDER BY "sortOrder",name,id',
};
const result = {};
try {
  await client.query('BEGIN READ ONLY');
  for (const [name, sql] of Object.entries(queries)) {
    const values = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await client.query(sql);
      values.push(performance.now() - start);
    }
    const plan = (
      await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`)
    ).rows[0]['QUERY PLAN'][0];
    const clean = (p) =>
      Object.fromEntries(
        Object.entries(p)
          .filter(([key]) =>
            [
              'Node Type',
              'Relation Name',
              'Index Name',
              'Actual Startup Time',
              'Actual Total Time',
              'Actual Rows',
              'Actual Loops',
              'Shared Hit Blocks',
              'Shared Read Blocks',
              'Sort Method',
              'Sort Space Used',
              'Planning Time',
              'Execution Time',
              'Plan',
              'Plans',
            ].includes(key),
          )
          .map(([key, value]) => [
            key,
            key === 'Plan'
              ? clean(value)
              : key === 'Plans'
                ? value.map(clean)
                : value,
          ]),
      );
    result[name] = { sql, latencyMs: stats(values), explain: clean(plan) };
  }
  await client.query('ROLLBACK');
  save(process.argv[2], { connectMs, queries: result });
  console.log(
    `Read-only SQL timings and EXPLAIN ANALYZE saved: ${process.argv[2]}`,
  );
} finally {
  await client.end();
  agent.destroy();
}

import 'dotenv/config';
import { Pool } from 'pg';
import { IANAZone } from 'luxon';
// Read-only by design. A timestamp alone cannot establish an original wall time.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
});
const connection = await pool.connect();
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
try {
  await connection.query('BEGIN READ ONLY');
  const columns = await connection.query<{
    table_name: string;
    column_name: string;
    data_type: string;
  }>(
    `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND data_type IN ('timestamp with time zone', 'timestamp without time zone') ORDER BY table_name, column_name`,
  );
  const checks = [];
  for (const column of columns.rows) {
    const result = await connection.query(
      `SELECT count(*)::int AS invalid FROM public.${quote(column.table_name)} WHERE NOT isfinite(${quote(column.column_name)})`,
    );
    checks.push({ ...column, nonFiniteValues: result.rows[0].invalid });
  }
  const zones = await connection.query<{ timezone: string }>(
    'SELECT timezone FROM public."bakerySettings"',
  );
  const hours = await connection.query(
    `SELECT count(*)::int AS invalid FROM public."businessHours" WHERE weekday NOT BETWEEN 1 AND 7 OR "openMinute" < 0 OR "closeMinute" > 1440 OR "openMinute" >= "closeMinute"`,
  );
  console.info(
    JSON.stringify(
      {
        mode: 'read-only',
        timestampColumns: checks,
        invalidTimezones: zones.rows.filter(
          (row) => !IANAZone.isValidZone(row.timezone),
        ).length,
        invalidBusinessHours: hours.rows[0].invalid,
        correctionApplied: false,
      },
      null,
      2,
    ),
  );
  await connection.query('ROLLBACK');
} finally {
  connection.release();
  await pool.end();
}

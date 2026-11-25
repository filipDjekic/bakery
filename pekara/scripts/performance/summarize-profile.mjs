import { readFileSync } from 'node:fs';
import { save, stats, agent } from './common.mjs';
const records = readFileSync(process.argv[2], 'utf8')
  .trim()
  .split('\n')
  .map(JSON.parse);
const requests = records.filter((r) => r.type === 'request');
const sql = records.filter((r) => r.type === 'sql');
const groups = {};
for (const r of requests) {
  const key = `${r.method} ${r.path} ${r.status}`;
  (groups[key] ??= []).push(r);
}
const queries = {};
for (const r of sql) (queries[r.sql] ??= []).push(r.durationMs);
save(process.argv[3], {
  routes: Object.fromEntries(
    Object.entries(groups).map(([key, values]) => [
      key,
      {
        n: values.length,
        firstQueryCount: values[0].queries,
        warmQueryCounts: values.slice(1).map((v) => v.queries),
        sqlDurationMs: stats(values.map((v) => v.sqlMs)),
      },
    ]),
  ),
  connections: stats(
    records.filter((r) => r.type === 'connect').map((r) => r.durationMs),
  ),
  queries: Object.entries(queries).map(([sql, values]) => ({
    sql,
    ...stats(values),
  })),
});
agent.destroy();

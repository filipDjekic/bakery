import { readFileSync, readdirSync } from 'node:fs';
const baseline = JSON.parse(
  readFileSync('scripts/legacy-migration-baseline.json', 'utf8'),
) as Record<string, string>;
const edges = new Set<string>();
for (const name of readdirSync('migrations/app').sort()) {
  if (name === 'refs') continue;
  const migration = JSON.parse(
    readFileSync(`migrations/app/${name}/migration.json`, 'utf8'),
  ) as { from: string | null; to: string; migrationHash: string };
  if (baseline[name] && baseline[name] !== migration.migrationHash)
    throw new Error(`Historical bundle changed: ${name}`);
  const edge = `${migration.from}:${migration.to}`;
  if (edges.has(edge) && !baseline[name])
    throw new Error(`New duplicate migration edge: ${name}`);
  edges.add(edge);
}
console.info('Historical graph preserved; no new duplicate edges.');

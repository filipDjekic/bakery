import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateProductionMigration } from './production-migration-guard.ts';
validateProductionMigration(process.env);
function run(script: string, args: string[] = []) {
  const result = spawnSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--experimental-strip-types',
      script,
      ...args,
    ],
    { stdio: 'inherit', env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const prisma = fileURLToPath(
  new URL('../node_modules/prisma/dist/prisma.js', import.meta.url),
);
run('scripts/check-migration-graph.ts');
run(prisma, ['migration', 'check']);
run('scripts/check-data-integrity.ts');
run(prisma, ['db', 'migrate', '--show']);
run(prisma, ['db', 'migrate', '--yes']);
run(prisma, ['db', 'verify']);

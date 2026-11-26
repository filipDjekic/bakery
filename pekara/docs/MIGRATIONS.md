# Production migrations

This repository uses the Prisma 8 migration graph in `migrations/`, not the
legacy Prisma 7 `prisma migrate deploy` format. The production equivalent is
`prisma migration check` followed by `prisma db migrate` over committed
`ops.json` artifacts.

## Local development schema synchronization

Run these commands from `pekara/` after verifying that `DATABASE_URL` points
to the intended development database. Next development and the Prisma CLI
currently both load the local `.env` URL (`localhost:5432/pekara`). If local
Next environment overrides are added, compare their effective URL with the
CLI before applying migrations; generating a client does not migrate a database.

```powershell
pnpm.cmd prisma migration status
pnpm.cmd prisma migration check
pnpm.cmd prisma db migrate --show
pnpm.cmd prisma db migrate --yes --advance-ref db
pnpm.cmd prisma:generate
pnpm.cmd prisma db verify
```

The missing `order.originalTotalMinor` error on 2026-11-25 was caused by the
development database remaining at contract `4f67248e1dcb` while application
code used the newer contract. The existing `20261125T1404` and `20261125T1430`
bundles had not been applied. The domain schema is `src/prisma/contract.prisma`;
`prisma/schema.prisma` and its generated Prisma 7 client are only the auth
projection, not a second migration owner. The domain enum uses PostgreSQL
`text` plus CHECK constraints, which include `LATE` on both orders and history.
There is no native PostgreSQL enum to alter and no table/column mapping mismatch.

The new `20261125T1510_backfill_order_original_totals` forward migration replaces
the two discount CHECKs to allow an undiscounted original-total snapshot, then
backfills only rows with a missing original total, zero discount, and no discount
timestamp. It copies `totalMinor` into `originalTotalMinor` without changing
totals, timestamps, already applied discounts, or `OrderItem` snapshots. The
15% rate remains the existing code constant and CHECK formula; no separate rate
column is part of the model. `product.unitLabel` and `allergenInfo` were already
present. Prior migration bundles remain unchanged.

All three bundles were applied to the local development database. Full schema
verification and reads of all modeled columns succeeded. Before/after fingerprints
confirmed preservation of every earlier column in all 14 public tables, including
5 order totals and 8 item snapshots. No tests, lint, typecheck, or build were run
for this database correction. Production was not changed.

## Release procedure

1. Confirm CI is green and migration files are reviewed and committed.
2. Verify the latest usable backup and record its timestamp and expected RPO.
3. Rehearse the exact migration against a restored non-production database.
4. Inject the production `DATABASE_URL` from secret storage.
5. Set `CONFIRM_PRODUCTION_MIGRATION=APPLY_REVIEWED_MIGRATIONS` only for this
   command and run `pnpm db:migrate:production`.
6. Stop the release immediately if any step fails. Do not deploy application
   code expecting the new schema.
7. Deploy the application, then run `pnpm db:verify` and the production smoke
   checklist.
8. Remove the one-command confirmation variable.

The script performs an offline graph integrity check, a read-only migration
preview, migration apply, and schema verification. It rejects loopback URLs to
reduce accidental misuse.

Never run schema push, development migration generation, or ad-hoc SQL in the
release pipeline. A destructive migration requires a written data migration,
backup, rollback/forward-fix decision, maintenance-window plan, and explicit
owner approval.

## Integrity migration and local verification

The additive 20261123T2335 bundle adds numeric/schedule/configuration CHECKs, optional verified product information, and durable notification tracking. It preserves old orders and snapshot columns; it has no destructive operation. Before a release apply, run `pnpm data:check` against the intended database using a read-only operator connection. It prints only incompatible-row counts; any incompatible data requires reviewed correction first. The production migration wrapper runs this scan before apply and validates core env/explicit confirmation. Never run the wrapper merely to test it on a live DB.

Verify with `pnpm migration:check`, `pnpm migration:replay`, integration CHECK/concurrency tests and `pnpm db:verify`. Replay/reset helpers refuse non-loopback or non-*_test URLs. The application and auth projections have one physical migration owner; see ARCHITECTURE.md. Migration replay does not prove existing production data compatibility or restore readiness.

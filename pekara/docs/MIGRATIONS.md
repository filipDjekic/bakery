# Production migrations

This repository uses the Prisma 8 migration graph in `migrations/`, not the
legacy Prisma 7 `prisma migrate deploy` format. The production equivalent is
`prisma migration check` followed by `prisma db migrate` over committed
`ops.json` artifacts.

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

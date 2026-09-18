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

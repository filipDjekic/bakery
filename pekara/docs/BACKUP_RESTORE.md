# Backup and restore strategy

## Policy

Prisma Postgres currently creates daily snapshots on days with database
activity for supported plans. The documented retention is 7 days for Starter
and Pro and 30 days for Business. Confirm the active plan and actual Backups tab
before launch; this document is not evidence that a snapshot exists.

Target objectives must be approved by the owner:

| Item                              | Value/evidence          |
| --------------------------------- | ----------------------- |
| Database plan                     | `PENDING`               |
| Snapshot frequency                | `PENDING CONSOLE CHECK` |
| Retention                         | `PENDING CONSOLE CHECK` |
| Last usable snapshot              | `PENDING`               |
| Approved RPO                      | `PENDING`               |
| Approved RTO                      | `PENDING`               |
| Primary/secondary owner           | `PENDING`               |
| Last non-production restore drill | `PENDING`               |

## Restore drill

1. Select a recent production snapshot in Prisma Console.
2. Re-instantiate it as a new, isolated non-production database. Never target
   the live production database.
3. Store its connection string as a temporary secret and run `pnpm db:verify`.
4. Verify representative category/product/order counts and one order with its
   items/status history. Do not send notifications or modify production.
5. Record snapshot time, restore start/end, achieved RPO/RTO and verifier.
6. Delete the temporary database and credential after evidence is retained.

Run this drill before launch and quarterly. If the latest snapshot violates the
approved RPO, stop launch/release and add an independent `pg_dump` process or
upgrade the plan before proceeding.

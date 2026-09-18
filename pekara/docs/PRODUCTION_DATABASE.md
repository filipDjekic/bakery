# Production database

## Required topology

- Create a dedicated Prisma Postgres database for production; do not attach a
  development, CI, or Preview database.
- Choose the Prisma region closest to the Vercel function region and primary
  customer base. Record both regions below before launch.
- Store the pooled production connection string only as Vercel's sensitive
  `DATABASE_URL` for the Production environment. Use a different database and
  credential for Preview.
- Restrict Prisma Console and Vercel project access to the operational owners.

## Provisioning record

Fill this with non-secret identifiers only.

| Field                                      | Evidence  |
| ------------------------------------------ | --------- |
| Prisma workspace/project                   | `PENDING` |
| Database identifier                        | `PENDING` |
| Database region                            | `PENDING` |
| Vercel function region                     | `PENDING` |
| Primary owner                              | `PENDING` |
| Secondary owner                            | `PENDING` |
| Production `DATABASE_URL` scoped in Vercel | `PENDING` |
| Separate Preview database configured       | `PENDING` |
| Backup plan and retention confirmed        | `PENDING` |

Never paste a connection string into this document, an issue, CI output, or a
shell history entry. Add it through the Vercel dashboard or an approved secret
manager.

## Read-only smoke test

From a trusted operator environment, inject `DATABASE_URL` without writing it to
disk and run:

```powershell
pnpm db:verify
```

Success means Prisma can read the database marker and schema and both match the
emitted contract. It does not prove backup/restore readiness; complete
`BACKUP_RESTORE.md` separately.

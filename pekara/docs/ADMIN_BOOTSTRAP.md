# Production administrator bootstrap

The bootstrap command creates exactly one first administrator and refuses a
second run when an admin already exists.

## Procedure

1. Complete migrations and verify the production database.
2. Generate a unique password in the organisation password manager. Do not use
   a shared/default password.
3. In an isolated operator shell, provide `DATABASE_URL`, `APP_URL`,
   `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_NAME`,
   `ADMIN_PASSWORD`, `NODE_ENV=production`, and
   `CONFIRM_PRODUCTION_ADMIN_BOOTSTRAP=CREATE_FIRST_ADMIN`.
4. Run `pnpm admin:create`. The command logs only the created email, never the
   password.
5. Immediately unset `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_NAME`, and the
   confirmation value. Remove temporary values from Vercel if they were used.
6. Sign in at `/admin/login`, verify the ADMIN role, then sign out and back in.
7. Store the credential only in the approved password manager.

If the command reports that an administrator already exists, stop. Recover or
manage that account through an approved operational procedure; do not weaken the
single-bootstrap guard or delete production users casually.

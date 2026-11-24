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

## Reset an existing local administrator password (Windows CMD)

Stop the local app with Ctrl+C first, and keep its local PostgreSQL server
running. This recovery command does not create users, activate inactive users,
change roles, delete orders or reset the database. It updates exactly one
existing Better Auth `credential` account and deletes that user's DB sessions
in one transaction. User ID and order history remain unchanged.

1. Open Windows **Command Prompt**, then edit the existing local file:

   ```cmd
   cd /d C:\Users\cofid\Desktop\GITHUB\pekara\bakery\pekara
   notepad .env
   ```

2. Set `ADMIN_EMAIL` to the existing administrator's email and `ADMIN_PASSWORD`
   to a new unique password (12–128 characters), then save. Quote the password
   in dotenv syntax, particularly if it contains `#` or spaces. The password is
   read literally, without trimming. Do not put it on the command line or commit
   `.env`. `DATABASE_URL` must point to the intended local DB; `APP_URL` and any
   `BETTER_AUTH_URL` must be loopback origins.

3. Execute the reset yourself:

   ```cmd
   pnpm.cmd --config.verify-deps-before-run=false run admin:reset-password --confirm-local
   ```

4. After success, remove `ADMIN_PASSWORD` from `.env` and save it. Then start
   the local app:

   ```cmd
   pnpm.cmd --config.verify-deps-before-run=false run dev
   ```

5. In a second CMD window, open the login page:

   ```cmd
   start "" "http://localhost:3000/admin/login"
   ```

   Sign in using the existing `ADMIN_EMAIL` and the new password. Existing
   sessions are invalidated. The user's existing active/inactive state is
   preserved; resetting an inactive account does not enable login.

The script reads `pekara/.env` relative to its own location. It refuses production
`NODE_ENV`, hosted/CI markers, remote PostgreSQL, URL query connection overrides,
non-local application origins, inherited connection/origin values that differ
from `.env`, non-ADMIN users, and missing or ambiguous credential accounts. There
is no production override. Do not use a production tunnel mapped to loopback;
these checks cannot establish the provenance of a forwarded local port.

The hash comes from the current Better Auth context, including its password
length policy. The current configuration uses database sessions without cookie
cache/secondary storage; recovery refuses those caching configurations if they
are introduced later. Neither password nor hash nor raw DB errors are printed.
No migration is required. Adding this command does not execute it automatically.

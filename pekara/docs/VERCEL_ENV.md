# Vercel project and environment variables

Set the Vercel project Root Directory to `pekara`, framework preset to Next.js,
Node.js to 24, and production branch to the repository's protected release
branch.

## Environment matrix

Every sensitive value is entered in Vercel, never committed. Production and
Preview must use independent credentials and databases.

| Variable                         | Production              | Preview              | Browser-visible |
| -------------------------------- | ----------------------- | -------------------- | --------------- |
| `DATABASE_URL`                   | production DB           | preview DB           | no              |
| `APP_URL`                        | canonical HTTPS origin  | preview origin       | no              |
| `BETTER_AUTH_URL`                | same canonical origin   | preview origin       | no              |
| `BETTER_AUTH_SECRET`             | unique 32+ random bytes | different secret     | no              |
| `RATE_LIMIT_HMAC_SECRET`         | unique 32+ random bytes | different secret     | no              |
| `BLOB_READ_WRITE_TOKEN`          | production store        | preview store/token  | no              |
| `SENTRY_DSN`                     | production project/DSN  | preview project/DSN  | no              |
| `NEXT_PUBLIC_SENTRY_DSN`         | browser DSN             | preview browser DSN  | yes             |
| `SENTRY_AUTH_TOKEN`              | build scope only        | build scope only     | no              |
| `SENTRY_ORG`, `SENTRY_PROJECT`   | build metadata          | build metadata       | no              |
| `SENTRY_ENVIRONMENT`             | `production`            | `preview`            | no              |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production`            | `preview`            | yes             |
| `SENTRY_RELEASE`                 | commit SHA/release      | preview commit SHA   | no              |
| `NEXT_PUBLIC_SENTRY_RELEASE`     | same release            | same preview release | yes             |

Generate auth and HMAC secrets independently with a password manager or CSPRNG.
Do not reuse a value across environments or purposes. Check copied values for
leading/trailing whitespace.

## Verification

1. Run `pnpm env:check:production` using the Production environment.
2. Run `vercel env run -e production -- pnpm build` from a linked project.
3. Inspect Vercel scopes and confirm Production-only secrets are absent from
   Preview.
4. Search `.next/static` for known secret values before launch.
5. Redeploy after environment changes; existing deployments do not receive new
   values automatically.

Do not expose server secrets with `NEXT_PUBLIC_` prefixes.

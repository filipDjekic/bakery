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
| `CRON_SECRET`                    | unique 32+ characters   | different secret     | no              |
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

## Scheduled late orders

`vercel.json` invokes `/api/cron/late-orders` every minute in production. Set
`CRON_SECRET` before deployment; Vercel sends it in the Bearer authorization
header. Missing or incorrect credentials return 401, including outside
production. Production preflight requires this secret on Vercel.

The configured minute interval requires Vercel Pro or Enterprise. Hobby permits
daily cron jobs, which cannot meet the order-processing requirement. See
[Vercel's current cron limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing)
and [cron authentication](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs#securing-cron-jobs).
No paid plan or hosting setting is changed by the repository code.

Apply the reviewed migrations before deploying this application version. A run
handles bounded batches, uses UTC instants, atomically updates price/status/history,
and tolerates overlapping or repeated invocations. Missed/failed invocations are
caught up by a subsequent run. Monitor invocation errors and backlog; this is a
minute-resolution schedule, not an exact-time timer.

## Core, optional and release gates

Core production requires PostgreSQL DATABASE_URL, canonical HTTPS APP_URL, same-origin BETTER_AUTH_URL if set, independent32+character BETTER_AUTH_SECRET and RATE_LIMIT_HMAC_SECRET, and an explicit trusted ingress policy. Optional features default off: EMAIL_ENABLED, BLOB_ENABLED and SENTRY_ENABLED. Enabled features require their credentials; client monitoring separately uses NEXT_PUBLIC_SENTRY_ENABLED=true plus browser DSN. Empty optional host variables are treated as absent; outer whitespace remains invalid. Never prefix server keys with NEXT_PUBLIC_.

Use the manual Release configuration preflight workflow with the production GitHub environment, or `pnpm env:check:production` in the release owner environment. PR CI uses isolated test credentials only and must not require live secrets. Runtime startup also validates production core/optional configuration. The production-build phase delegates configuration validation to release preflight; a narrowly guarded loopback *_test harness may exercise a production build over HTTP. Do not set test reset/local proxy flags on a public deployment.

Vercel supplies VERCEL=1 and overwrites x-forwarded-for at ingress. The app accepts a single normalized address there; verify deployed spoofed/missing/IPv6 behavior before release. Self-hosted deployments must set TRUSTED_PROXY_MODE=proxy and TRUSTED_PROXY_HOPS=1..5, select the client from the trusted right side of the chain, and firewall direct origin access. Every trusted proxy must append/overwrite headers consistently. Missing/invalid trusted IP information fails closed. Local dev ignores injected headers. See the official Vercel request-header contract: https://vercel.com/docs/headers/request-headers . Only HMAC fingerprints are persisted/logged, not raw IP.

Release sequence: green CI and reviewed diff → configuration preflight → verified backup/restore rehearsal → read-only data compatibility → reviewed migration apply by owner → app deploy → schema verify and production smoke. No part of local remediation provisions paid services, deploys or applies production changes.

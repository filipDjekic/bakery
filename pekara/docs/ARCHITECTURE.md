# Data ownership and service boundaries

The application remains one Next.js monolith with PostgreSQL. Route handlers own HTTP parsing/status/correlation; authorized Server Actions own staff mutation entry points; services own rules/transactions; queries produce UI read models. DB/secret-bearing entry points are server-only. Integer minor units and historical order snapshots remain authoritative.

## Two clients, one migration owner

`src/prisma/contract.prisma` (Prisma8.0.0-rc.9) is the sole physical schema owner, including auth tables. It emits contract.json/d.ts and the migration graph. `prisma/schema.prisma` is only the Better Auth adapter projection. Its generated Prisma7.10.0 client is committed under src/generated/prisma. DateTime maps to timestamptz string columns; auth role String maps to the contract's text enum. Both clients read/write the same database, but transactions are never composed across clients.

Immediate consolidation would replace an RC query/migration API or the working Better Auth Prisma adapter across all service paths. This remediation preserves the tested adapter instead of forcing a broad ORM migration. Future consolidation must first prove adapter feature compatibility on a restored test DB, migrate read/service modules incrementally with equivalence tests, and keep one migration owner until every responsibility is replaced. No production history rewrite/db push is permitted.

## Reproducible generation

- App contract: `pnpm prisma:generate`; review emitted diff.
- Auth projection only when it changes: `pnpm dlx prisma@7.10.0 generate --config prisma.auth.config.ts`. The pinned generator matches the committed/runtime client version. Review generated diff; never use its migration/db-push commands.
- `pnpm schema:check` compares the auth schema, generated inline schema and app scalar projection. CI emits app contract and rejects unstaged artifact drift.
- `pnpm migration:check` validates legacy hashes/new edges and Prisma graph integrity. `pnpm migration:replay` creates a unique loopback *_test database, migrates/verifies it from empty, then removes only that database.

The seven legacy bundles contain four duplicate graph edges. They are valid graph history, preserved by hash. New duplicate edges are rejected. Planning must use the actual reviewed graph tip; the offline db ref was explicitly advanced after this migration. Do not generate another empty-to-current baseline.

## Concurrency and connections

Conditional status/settings writes use updateAll and require exactly one affected row. Prisma8 update first resolves identity and cannot be used as a compare-and-swap substitute. Status history is inserted only after successful update, inside the same transaction.

Checkout locks settings shared, then product/category rows in deterministic order; final acceptance/hours/prices/availability reads and order/items/history/notification rows share that transaction. Earlier admin writers finish before validation; later writers wait for checkout commit. Working-hours replacement first versions/locks the settings parent. App version writes use millisecond ISO timestamps; direct operational writes must preserve millisecond precision, or refresh/normalize versions before using app CAS.

The domain client has a single module pool (pg default max10) with5s connect/10s idle timeout; auth has max5 with the same timeouts. Development hot reload reuses both clients. Budget up to15 connections per runtime instance plus migrations/operations, multiplied by deployment instances. Use provider pooling and sizing; neither client is closed per request. Test/CLI modules close their own clients at completion. RC dependency compatibility remains a release risk to monitor; no broad version upgrade is part of this remediation.

## Lateness and preparation

`Order.status` is the preparation workflow. `lateDiscountAt` records lateness independently; `readyAt` records the actual READY transition. `LATE` remains an enum value for old audit entries and backward compatibility; the new migration restores active legacy rows from their pre-LATE history, conservatively choosing NEW if that information is absent. No automatic worker advances preparation.

Both cron and staff lock the order row before reading or changing it. Before a staff transition closes an overdue active order, it applies any missing discount in the same transaction. The existing missed-pickup policy applies even if preparation finished on time; whether to compensate bakery delay only remains a business decision. Exactly at pickup time an order is not overdue. All comparisons use UTC instants; preparation and pickup display use the bakery timezone. Terminal orders cannot be changed by either path. Item prices and original totals remain snapshots.

Product/category browser forms carry `updatedAt` versions. Catalog writes use conditional updates and strictly increasing millisecond versions. Category locks precede product writes; category deactivation holds the category exclusively while checking its products. Active products under a deactivated category remain hidden, and new activation/availability requests require an active parent. Stable slugs and historical order-item snapshots are preserved.

Checkout validates the current clock after waiting for input locks. The browser clears rejected pickup selections and refreshes availability. An ambiguous submission is retained in session storage with its exact payload and idempotency key; its recovery action can query the original submission even after its pickup time expires. New submissions remain blocked until the uncertain attempt is resolved. When storage is unavailable, mounted-checkout recovery still works; persistence across refresh cannot be guaranteed.

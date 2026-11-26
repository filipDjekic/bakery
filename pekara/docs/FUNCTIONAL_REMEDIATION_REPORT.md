# Functional remediation report

26 November 2026. The implementation preserves the Next.js modular monolith, Serbian Latin UI, integer prices, authorization boundaries, stable product URLs and historical item prices. Development and production databases were neither migrated nor reset. All database-changing verification used newly created, guarded loopback test databases. Nothing was deployed.

## 1 Confirmed functional defects

| ID  | Confirmed behavior before remediation                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Automatic lateness replaced NEW, ACCEPTED, IN_PREPARATION or READY with LATE, losing the operational stage and allowing completion of unfinished orders.                                                                  |
| D02 | A staff completion before cron could avoid the discount; cron before the same completion applied it.                                                                                                                      |
| D03 | INVALID_PICKUP_SLOT left a rejected selection available for resubmission; dates and acceptance settings remained stale.                                                                                                   |
| D04 | An older failed slot request could replace a newer request's UI error state. Order requests lacked a timeout and accepted malformed success/conflict payloads. Signature/key generation escaped checkout's error handler. |
| D05 | A successful checkout cleared the entire current cart, including products added while the request was pending.                                                                                                            |
| D06 | The client retained only one draft's idempotency key. Ambiguous submissions were difficult to recover after refresh or slot expiration.                                                                                   |
| D07 | Email retries reconstructed current prices/settings under the original provider key. Discounted totals could disagree with unchanged item subtotals.                                                                      |
| D08 | An expired fifth notification lease stayed SENDING; pending and failed deliveries had no automatic recovery. Confirmation emails lacked a status link.                                                                    |
| D09 | Editing and quick toggles did not consistently validate inactive parent categories. Product/category writes could overwrite concurrent edits; image replacements could leave orphaned references.                         |
| D10 | Unknown or inactive category URLs silently displayed the whole catalog. Sale units were absent from cart/order snapshots.                                                                                                 |

## 2 Root causes

- D01–D02: lateness was a preparation status, and automated processing alone owned the discount. Conditional status changes did not share one locked read with discount calculation.
- D03–D06: checkout treated recoverable validation errors and uncertain network outcomes alike; availability was a one-time server prop, browser requests were insufficiently validated, and cart clearing used current rather than submitted contents.
- D07–D08: delivery records stored attempt state without the original rendered payload. Retry reconstruction depended on mutable order/settings records; exhausted leases and lost scheduling lacked a recovery path.
- D09: category checks and writes were separate operations; catalog forms lacked optimistic versions. Concurrent replacements read the same old image without detecting the losing write.
- D10: catalog selection used a full-catalog fallback. The cart and order-item models did not carry sale units.

## 3 Implemented fixes

- Preparation status remains NEW → ACCEPTED → IN_PREPARATION → READY → COMPLETED, with cancellation along the supported paths. `lateDiscountAt` is independent metadata. `readyAt` records the actual READY transition. Legacy LATE remains available for historical data but cannot incorrectly complete an unknown stage.
- Cron and staff actions lock the same order row before reading it. Each staff transition applies a qualifying missing discount before changing status, in the same transaction. Repeated workers create one discount and one audit event. Terminal orders cannot be changed. Discount events retain the preparation status in history.
- Original totals, item prices and quantities remain snapshots. The 15% calculation uses integer arithmetic and existing database discount checks. Exact deadline equality is not late; comparisons use UTC instants.
- Admin badges show both stage and lateness; the LATE filter and counter read active orders' metadata. Public confirmations retain the real stage, pricing breakdown and sale units without exposing customer contacts.
- Checkout clears invalid selections, reloads dates/slots/settings, refreshes on focus and periodically, rejects stale responses, validates response shapes, bounds requests and honors rate-limit delays. Signature and key failures use the normal checkout error flow.
- An uncertain submission retains its exact request and idempotency key in session storage. Its recovery action works after refresh or pickup expiration. New submissions remain blocked while the previous outcome is uncertain. Successful navigation has a status-link fallback. Submitted cart quantities are consumed without clearing unrelated items.
- New email deliveries store immutable rendered HTML, sender, recipient, subject and provider key. Original confirmation retries remain creation-time confirmations; the status link shows current data. Explicitly discounted emails show original, discount and final totals consistently.
- Notification claims fence stale workers by attempt number. Expired fifth leases become FAILED. The authenticated cron also recovers eligible deliveries with bounded batches/backoff. Already attempted messages older than the conservative 23-hour window require manual review. Legacy messages without an original payload are visibly failed rather than regenerated under an old key.
- Product/category forms and toggles use versions with strictly increasing millisecond timestamps. Category locks serialize validation with deactivation; conditional writes reject stale edits. Losing image uploads are deleted, and only the winning replacement deletes the previous image. Slugs and historical order prices are preserved.
- Invalid category URLs render the Serbian missing page; valid search/sort context remains in the URL. Sale units flow from products through cart, checkout, order snapshots, email and order details.

## 4 Additional defects discovered and corrected

- Checkout originally validated its arrival-time clock even after waiting for database locks. It now checks time after acquiring those locks, preventing a newly expired slot from being accepted.
- Lateness and a staff transition could produce misleading audit ordering when both happened together. Explicit timestamps order the discount event before the staff event.
- PostgreSQL timestamp strings and browser ISO versions required consistent handling; catalog version validation accepts both, and the product-detail query returns canonical ISO versions.
- Cart changes did not synchronize across browser tabs. Storage-event synchronization now refreshes mounted carts. Malformed sale-unit metadata is rejected.
- A sale-unit change while checkout was open could silently change what a quantity represented. Updated checkout requests include a validated unit snapshot; the server rejects a changed unit with an explicit Serbian explanation and requires removing/re-adding that line. The optional field keeps older API clients compatible, and the existing canonical payload hash includes it for new requests.
- The integration runner's RSC-only React entry prevented real email HTML rendering. Its resolver now uses the real React/React DOM rendering runtime while retaining `server-only` checks and real database/provider-boundary tests.

## 5 Modified files

The exact file list is appended below. Existing user changes to `docs/MIGRATIONS.md`, `docs/VERCEL_ENV.md` and the earlier root/admin reports were preserved and are excluded from this remediation's list. No dependencies were added.

## 6 Database schema and migration

New additive migration: `migrations/app/20261126T1358_operational_lateness_and_email_snapshots`.

| Field                                             | Purpose                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Order.readyAt` nullable timestamptz              | Actual preparation completion time; existing READY history supplies known timestamps. |
| `OrderItem.unitLabel` nullable varchar(40)        | Sale-unit snapshot for new orders. Legacy unknown units remain null.                  |
| `OrderNotificationDelivery.payload` nullable text | Immutable original email data and rendered provider payload.                          |

Active legacy LATE rows resume their recorded pre-LATE stage. Missing stage history conservatively resumes at NEW, with an explicit migration audit entry. Applied discounts, original totals and existing item snapshots are preserved. Terminal statuses and totals are preserved. Old pending/failed/sending notifications with no reconstructable original payload become FAILED for manual review. Existing migrations were not rewritten; emitted contracts, the new snapshot and offline graph ref were updated.

Empty-database replay and a separate data-bearing upgrade were executed. The upgrade test covers all four preparation stages, missing history, terminal totals, readiness backfill, unchanged item snapshots, legacy leases and repeat execution.

## 7 Regression coverage

- Unit/component tests: checkout transport validation, non-JSON rate limits, ambiguous retries, expired selections/dates, stale request failures, crypto failures, settings changes, refresh recovery, cart edits during submission, multiple draft keys, discounted email totals, immutable payloads, sale units and shared customer-name boundaries.
- PostgreSQL integration tests: concurrent workers/staff, every overdue preparation stage, ready-before-deadline policy, terminal immutability, exact boundaries, DST repeated instants, discount/revenue inputs, late filters/counters, notification leases/recovery/fencing, immutable email retries, inactive categories, catalog versions, image races and lock-delayed pickup expiration.
- Playwright tests: expired checkout recovery, lost committed response, cross-tab cart synchronization, missing categories and concurrent product forms, alongside existing customer/admin/security workflows and the six-width screenshot/axe matrix.
- Migration regression: `tests/helpers/verify-functional-migration.ts` creates and removes only a uniquely named isolated test database.

## 8 Executed checks

Commands use `pnpm.cmd --config.verify-deps-before-run=false`.

| Check                                               | Actual result                                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `run lint`                                          | Passed, no errors or warnings.                                                                                                     |
| `run typecheck`                                     | Passed. The production build also completed TypeScript checking.                                                                   |
| `run test --maxWorkers=2`                           | 254 tests passed in 65 files; 0 failed, 0 skipped.                                                                                 |
| `run test:integration`                              | 121 tests passed; 0 failed, 0 cancelled, 0 skipped. Real PostgreSQL transactions and concurrent requests were exercised.           |
| `run test:e2e` with `E2E_PRODUCTION=true`           | 24 tests passed, including the six-width screenshots/axe matrix; 0 failed, 0 skipped.                                              |
| Final customer workflow rerun                       | All 6 tests passed against the final production build after sale-unit validation was added.                                        |
| Final checkout/cart/validation unit rerun           | All 41 tests passed after legacy sale-unit compatibility was verified.                                                             |
| `run test:a11y`                                     | 3 tests passed separately; 0 failed, 0 skipped.                                                                                    |
| `run build`                                         | Optimized production build passed against an isolated test database.                                                               |
| `run schema:check`                                  | Auth projection and generated auth client match the schema owner.                                                                  |
| `run migration:check`                               | Existing graph preserved; no new duplicate edges; Prisma artifact/graph checks passed.                                             |
| `run migration:replay`                              | Fresh isolated database migration, verification and status checks passed.                                                          |
| `verify-functional-migration.ts`                    | Data-bearing isolated upgrade and repeat execution passed.                                                                         |
| `run db:verify`                                     | Passed against the isolated remediation test database.                                                                             |
| `check-data-integrity.ts` with the test environment | Zero incompatible rows in every checked table.                                                                                     |
| `run format:check`                                  | Failed: 198 untouched files. No changed/new file remains in its failure list. Targeted formatting of the remediation files passed. |

The full browser run preceded the final additive sale-unit request validation. All six affected customer workflow tests then passed against the final production build. Raw logs are retained in the ignored `.test-postgres` directory. The Windows sandbox could not complete Playwright's process-tree shutdown; after all 24 assertions completed, the owned test server was explicitly stopped and the runner exited successfully. The separate accessibility and final customer runs reused explicitly managed isolated servers and exited successfully.

The production build was executed through the actual `run build` script with an explicitly guarded test-database environment. Browser tests use `E2E_PRODUCTION=true`. Docker was unavailable, so verification used a separate PostgreSQL 18 cluster created inside the ignored `.test-postgres` directory, bound to loopback. The full integration suite used a second isolated test database so it could not interfere with browser fixtures.

Initial runs exposed defects and test-fixture/locator mistakes that were corrected. Development-mode browser runs also hit compilation timeouts; the final browser verification uses the optimized build with unchanged assertions. No tests were disabled or skipped to obtain a passing result.

## 9 Remaining issues and limits

- Repository-wide formatting fails in 198 untouched files, including existing line-ending/style problems and historical artifacts. Changed/new hand-authored files pass targeted formatting. A broad unrelated reformat was intentionally avoided.
- Live Resend acceptance, DNS, production scheduler execution and hosted `after()` behavior require release-environment verification. Provider calls in tests use controlled senders; delivery outcomes are not proof that a customer read a message.
- Legacy notification payloads and missing historical sale units cannot safely be invented. Those notification rows require provider-log review; unknown legacy sale units remain null.
- Browser storage can be blocked. Mounted-checkout recovery still works, but persistence across refresh cannot be guaranteed in that case. Concurrent independent browser sessions retain independent submission contexts.
- Existing Prisma RC and hosting/connection-budget considerations remain as documented in `ARCHITECTURE.md`.

## 10 Business decisions requiring confirmation

The existing behavior discounts every missed pickup deadline, including a customer arriving after an order was ready. No inspected requirement explicitly limited this to bakery preparation delays, so this policy is preserved and tested. The unresolved decision is whether the 15% should instead compensate bakery delay only. `readyAt` now provides the timing needed for a future explicit policy change.

Customer names retain the existing shared 1–100 trimmed-character rule. No separate documented higher minimum was found; this remediation does not silently change it.

## 11 Release and environment requirements

1. Review and apply the new migration through the established release process; it has not been applied to development or production here. Coordinate replacement of all application/worker processes and pause the old cron during the rollout so an old worker cannot reintroduce LATE statuses.
2. Configure the existing minute scheduler to call `/api/cron/late-orders` with the correct `CRON_SECRET`. Monitor non-success responses and persistent `hasMore` backlogs; the same endpoint also recovers notifications.
3. For enabled email, configure `EMAIL_ENABLED`, `RESEND_API_KEY`, verified `EMAIL_FROM` and the public HTTPS `APP_URL`. Review legacy/exhausted/expired-window deliveries in admin and provider logs. Resend's documented idempotency window is 24 hours; the application uses a shorter 23-hour retry bound ([provider documentation](https://resend.com/docs/dashboard/emails/idempotency-keys), verified 26 November 2026).
4. Run the existing production environment preflight, backup/migration procedures and hosted smoke checks before release. No deployment, production migration, credential reset or destructive Git operation was performed.

## Modified file list

```text
.gitignore
.prettierignore
docs/ARCHITECTURE.md
docs/EMAIL.md
docs/FUNCTIONAL_REMEDIATION_REPORT.md
e2e/customer-order.spec.ts
e2e/remediation.spec.ts
eslint.config.mjs
migrations/app/20261126T1358_operational_lateness_and_email_snapshots/migration.json
migrations/app/20261126T1358_operational_lateness_and_email_snapshots/migration.ts
migrations/app/20261126T1358_operational_lateness_and_email_snapshots/ops.json
migrations/app/refs/db.json
migrations/snapshots/e0c3715567957912b2565406ef28a4d1da1fe6297ceb30450da2b01b4e8a33c4/contract.d.ts
migrations/snapshots/e0c3715567957912b2565406ef28a4d1da1fe6297ceb30450da2b01b4e8a33c4/contract.json
src/app/(public)/proizvodi/[slug]/page.tsx
src/app/(public)/proizvodi/page.tsx
src/app/admin/(protected)/orders/[id]/page.tsx
src/app/api/cron/late-orders/route.test.ts
src/app/api/cron/late-orders/route.ts
src/app/api/pickup-availability/route.ts
src/config/order-status.test.ts
src/config/order-status.ts
src/emails/new-order-notification.tsx
src/emails/order-confirmation.tsx
src/features/admin-orders/components/active-order-queue.tsx
src/features/admin-orders/components/order-mobile-cards.tsx
src/features/admin-orders/components/order-status-badge.tsx
src/features/admin-orders/components/orders-table.tsx
src/features/admin-products/actions/set-product-active.ts
src/features/admin-products/actions/set-product-available.ts
src/features/admin-products/actions/update-product.ts
src/features/admin-products/components/product-form.tsx
src/features/admin-products/components/product-toggles.tsx
src/features/admin-products/components/products-table.tsx
src/features/cart/components/cart-item.tsx
src/features/cart/hooks/use-cart-hydration.ts
src/features/cart/store/cart-storage.ts
src/features/cart/store/cart-store.test.ts
src/features/cart/store/cart-store.ts
src/features/cart/types.ts
src/features/catalog/components/product-card.tsx
src/features/categories/actions/update-category.ts
src/features/categories/components/category-form.tsx
src/features/checkout/api/create-order.test.ts
src/features/checkout/api/create-order.ts
src/features/checkout/components/checkout-cart-summary.tsx
src/features/checkout/components/checkout-form.tsx
src/features/checkout/components/checkout-recovery.test.tsx
src/features/checkout/lib/idempotency-storage.test.ts
src/features/checkout/lib/idempotency-storage.ts
src/features/checkout/lib/pending-submission.ts
src/features/orders/components/order-confirmation.tsx
src/prisma/contract.d.ts
src/prisma/contract.json
src/prisma/contract.prisma
src/server/email/delivery-tracking.ts
src/server/email/email-service.ts
src/server/email/notification-payload.ts
src/server/email/order-email-data.ts
src/server/email/order-notifications.test.ts
src/server/email/resend-client.ts
src/server/email/send-bakery-new-order.ts
src/server/email/send-customer-order-confirmation.ts
src/server/queries/admin-dashboard.ts
src/server/queries/admin-order.ts
src/server/queries/admin-orders.ts
src/server/queries/admin-products.ts
src/server/queries/catalog.ts
src/server/queries/order-confirmation.ts
src/server/repositories/orders.ts
src/server/repositories/products.ts
src/server/services/catalog-locks.ts
src/server/services/categories.ts
src/server/services/change-order-status.ts
src/server/services/create-order.ts
src/server/services/create-product.ts
src/server/services/order-lateness.ts
src/server/services/process-late-orders.ts
src/server/services/product-mutation.ts
src/server/services/recover-order-notifications.ts
src/server/services/retry-order-notifications.ts
src/server/services/toggle-product.ts
src/server/services/update-product.ts
src/validation/checkout.test.ts
src/validation/checkout.ts
tests/helpers/register-typescript.mjs
tests/helpers/verify-functional-migration.ts
tests/integration/admin-order-queries.test.ts
tests/integration/admin-products.test.ts
tests/integration/catalog-query.test.ts
tests/integration/concurrency.test.ts
tests/integration/email-delivery.test.ts
tests/integration/late-orders.test.ts
```

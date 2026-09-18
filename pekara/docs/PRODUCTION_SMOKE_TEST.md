# Production smoke test

Record deployment URL, release SHA, operator, start/end time, browser and every
evidence link. Use a clearly named test customer/order and never mutate a real
customer order.

## Customer

- [ ] Homepage, header/footer and today's hours render.
- [ ] Catalog/category filter and product detail render optimized images.
- [ ] Available product can be added; unavailable product cannot.
- [ ] Cart totals and checkout validation are correct.
- [ ] Valid pickup slot creates exactly one order.
- [ ] Confirmation shows the expected order number and totals.

## Admin

- [ ] Admin login succeeds on the canonical domain; invalid login fails.
- [ ] New smoke order appears in the paginated list and details.
- [ ] Status update persists after reload.
- [ ] Product availability toggle updates the public catalog.
- [ ] Image upload, display and replacement pass `IMAGE_STORAGE.md`.

## Infrastructure

- [ ] HTTP redirects to the canonical HTTPS URL with a valid certificate.
- [ ] Production database verification passes and Preview is isolated.
- [ ] Sentry check passes with release/source maps and without PII.
- [ ] Backup retention is confirmed and restore drill evidence exists.
- [ ] Browser console, failed requests and server logs contain no critical error.

Afterward cancel the smoke order with reason `PRODUCTION_SMOKE_TEST` if policy
allows; otherwise retain it clearly marked in the operational record. Restore
any toggled product state and remove temporary images. Launch is blocked while
any critical checkbox is incomplete.

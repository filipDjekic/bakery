# Transactional email

Order email is sent through Resend only after the order transaction commits. Delivery failure is logged without the recipient address or message body and does not change or roll back the order.

## Production setup

1. Add the sending domain in Resend and publish every DNS record Resend provides (SPF and DKIM included).
2. Wait until the domain is shown as verified.
3. Create a production API key with sending access.
4. Set `RESEND_API_KEY` and `EMAIL_FROM` in the deployment environment. `EMAIL_FROM` must use the verified domain, for example `Pekara <porudzbine@pekara.example>`.
5. Set `APP_URL` to the public HTTPS origin. Bakery notifications link to `/admin/orders/{id}`, which remains behind admin authentication.
6. Configure the recipient in Admin settings as `BakerySettings.notificationEmail`. If it is empty, bakery notification is intentionally skipped.

Run `pnpm env:check:production` before deployment, then place a real order with and without an optional customer email. Confirm both the customer message and bakery message in the Resend delivery log; also test a rejected provider request and confirm the order remains visible in Admin.

## Delivery lifecycle and recovery

Set EMAIL_ENABLED=true to enable sending; otherwise orders still work and recorded deliveries become SKIPPED. Enabled mode requires RESEND_API_KEY and a valid EMAIL_FROM. No recipient is recorded when that address is absent. Product data and credentials are never fabricated for email setup.

Checkout commits notification rows with the order, then Next after awaits both sends after the HTTP response. The route maxDuration is30s and each provider HTTP call receives an abort signal after5s. Hosting must support Next after/waitUntil; verify this on the target platform. This is not a separate background worker or an exactly-once guarantee.

A row moves PENDING → SENDING (30s lease) → SENT/FAILED/SKIPPED. Claims use a conditional write; attempt numbers fence stale workers from overwriting newer outcomes. An expired fifth lease becomes FAILED. The authenticated minute cron at `/api/cron/late-orders` also recovers pending, failed and expired deliveries with bounded batches and exponential backoff. Configure `CRON_SECRET` and monitor cron failures and notification failures in admin details.

New rows contain an immutable rendered payload: sender, recipient, subject, HTML, original item totals and provider idempotency key. Retries load that payload, regardless of later discounts, settings changes or template changes. Original confirmations describe the order at creation; the customer status link shows current preparation and pricing. Explicitly discounted emails show original total, discount and final total. Public status pages omit customer contacts.

Automatic and staff retries stop after five attempts or, for an already attempted message, after the conservative 23-hour recovery window measured from creation. Resend documents a 24-hour deduplication window and requires the same payload for a reused key ([provider documentation](https://resend.com/docs/dashboard/emails/idempotency-keys), checked 26 November 2026). The shorter application window avoids retrying an ambiguous send after deduplication may have expired. Old deliveries without an original payload are marked FAILED for manual provider-log review during migration; they are never regenerated under an existing key. Rendering failures also remain visible without rolling back a successfully created order. Staff must review these deliveries through the provider before deciding on a separate communication.

The admin status is the durable application attempt state, not proof that a customer read or received the message. Verify delivered/bounced status through the provider. Monitor failed/pending rows and agree an operator review cadence before launch. Email failure never removes or invalidates a committed order.

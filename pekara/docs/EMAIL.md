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

A row moves PENDING → SENDING (30s lease) → SENT/FAILED/SKIPPED. Process loss leaves pending/expired work visible in admin detail. Staff may retry failed/pending/expired rows, up to5 attempts. Active leases and terminal SENT/SKIPPED rows are not resent. CAS claims prevent concurrent staff retries sending the same recipient simultaneously. Resend receives a stable per-order/recipient idempotency key; duplicate reduction is limited by the provider retention window and unchanged payload requirements. Retrying much later can duplicate a send; inspect provider logs first. No automatic retry scheduler/queue is provisioned.

The admin status is the durable application attempt state, not proof that a customer read or received the message. Verify delivered/bounced status through the provider. Monitor failed/pending rows and agree an operator review cadence before launch. Email failure never removes or invalidates a committed order.

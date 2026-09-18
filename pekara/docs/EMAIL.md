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

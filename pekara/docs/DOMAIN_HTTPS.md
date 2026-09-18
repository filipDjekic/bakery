# Custom domain and HTTPS

## Decision record

Before configuration, record the registrable domain, DNS owner, Vercel project,
canonical host (`www` or apex), and redirect target. Do not guess these values.

## Procedure

1. Add both apex and `www` hosts to the Vercel project.
2. Apply the exact DNS records Vercel displays and wait for verification.
3. Select one canonical host and configure the other as a permanent redirect.
4. Set both `APP_URL` and `BETTER_AUTH_URL` to the same canonical HTTPS origin,
   without a trailing path.
5. Redeploy after environment changes.
6. Verify HTTP redirects to HTTPS, the certificate chain is valid, and apex/www
   resolve to the chosen canonical URL.
7. Test admin login, session persistence, logout, CSRF/origin enforcement,
   robots, sitemap and canonical metadata on the final host.

Do not broaden auth cookie domains unless subdomain sharing is an explicit
requirement. A preview URL must keep its own auth secret and origin.

## Evidence

Record DNS verification time, certificate issuer/expiry, canonical URL, redirect
results, and successful login timestamp. Never record session cookies.

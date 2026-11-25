# Pekara

Next.js modularni monolit, Node.js 24, pnpm 12 i PostgreSQL. Komande se izvršavaju
iz ovog direktorijuma u Windows CMD-u. Postojeći `.env` i baza ostaju sačuvani;
normalno lokalno pokretanje ne zahteva Docker.

## Razvoj

U `.env` podesiti postojeću lokalnu `DATABASE_URL`, `APP_URL=http://localhost:3000`,
isti `BETTER_AUTH_URL` i nezavisne nasumične tajne od najmanje 32 znaka.

```cmd
pnpm.cmd --config.verify-deps-before-run=false run dev --hostname 127.0.0.1
```

## Lokalni optimizovani produkcioni build

```cmd
pnpm.cmd --config.verify-deps-before-run=false run build:local
pnpm.cmd --config.verify-deps-before-run=false run start:local
```

Otvoriti `http://localhost:3000` (isti origin kao u `.env`). `start:local` vezuje
isključivo `127.0.0.1`, uzima port iz `APP_URL` i eksplicitno postavlja
`APP_ENV=local-production` samo u svom procesu. Oba URL-a i PostgreSQL moraju
biti loopback; javni hosting/CI se odbija. Produkcione tajne, origin/CSRF provere,
autorizacija i rate limiting ostaju uključeni. Lokalni HTTP cookie je
HttpOnly/SameSite=Lax; HTTPS deployment koristi Secure cookie. Prosleđeni IP
header-i se lokalno ignorišu. Ne koristiti ovaj režim za LAN, port forwarding,
tunel ili javni deployment.

## Stvarni produkcioni deployment

Deployment mora imati `APP_ENV=production` (ili bez te promenljive), iste HTTPS
`APP_URL`/`BETTER_AUTH_URL`, produkcione tajne i enforced reverse proxy:
`TRUSTED_PROXY_MODE=proxy`, `TRUSTED_PROXY_HOPS=1` ili stvarni broj poverljivih
hop-ova (1–5). Na Vercel-u važi njegov enforced ingress. Lokalni izuzetak je
u produkcionom preflight-u uvek zabranjen.

```cmd
pnpm.cmd --config.verify-deps-before-run=false run env:check:production
pnpm.cmd --config.verify-deps-before-run=false run build
pnpm.cmd --config.verify-deps-before-run=false run start --hostname 127.0.0.1
```

Preflight koristi promenljive procesa: učitati ih iz deployment secret store-a,
ne iz lokalnog razvojnog `.env`. Build/start nisu migracija niti automatski
deployment. Release: [docs/MIGRATIONS.md](docs/MIGRATIONS.md),
[docs/VERCEL_ENV.md](docs/VERCEL_ENV.md). Ne menjati administratorsku lozinku
prilikom normalnog pokretanja.

## Testovi

```cmd
pnpm.cmd --config.verify-deps-before-run=false run lint
pnpm.cmd --config.verify-deps-before-run=false run typecheck
pnpm.cmd --config.verify-deps-before-run=false run test --maxWorkers=2
```

Integracioni/E2E testovi resetuju samo eksplicitno dozvoljenu loopback `*_test`
bazu iz `.env.test`. Nikad ih ne usmeravati na postojeću razvojnu bazu.
Docker je opcioni način pokretanja izolovanog test PostgreSQL-a.
Detaljna merenja i komande: [../PERFORMANCE_REPORT.md](../PERFORMANCE_REPORT.md).

# Performance baseline

Ovaj dokument beleži performance odluke za MVP i granice koje treba ponovo
proveriti sa production podacima. Ciljani obim je najmanje 10.000 istorijskih
porudžbina i 100+ proizvoda.

## Javni katalog i cache

- Next.js Cache Components su uključene u `next.config.ts`.
- Javni katalog, detalj proizvoda, sitemap podaci i javni podaci početne strane
  koriste `use cache` sa `hours` profilom.
- Cache zavisnosti su eksplicitne: `catalog`, `categories`, `product:{id}` i
  `settings-public`.
- Admin Server Actions posle uspešnog upisa koriste `updateTag()`, pa naredno
  čitanje u istoj sesiji vidi novu vrednost bez čekanja na vremenski revalidate.
- Route Handler trenutno ne menja katalog ni podešavanja. Ako se takav endpoint
  uvede, treba da koristi `revalidateTag(tag, "max")`; order POST ne invalidira
  katalog jer ne menja proizvod.
- Checkout namerno ne koristi cached catalog model. `createOrder()` ponovo u
  jednom DB upitu učitava tražene proizvode i proverava cenu, aktivnost,
  dostupnost i aktivnost kategorije. Cached kartica zato nije autoritativna.
- Admin order upiti nisu cache-irani.

## Baza i upiti

- Admin lista porudžbina je server-side paginirana sa 25 redova po strani,
  ograničenim brojem kolona, stabilnim sortiranjem `createdAt DESC, id DESC` i
  zasebnim `COUNT` upitom. Ulazna stranica je ograničena da ne može proizvesti
  patološki veliki offset.
- Postoje indeksi za `Order(createdAt)`, `Order(pickupAt)` i
  `Order(status, createdAt)`, kao i FK/lifecycle indeksi za stavke i istoriju.
- Katalog učitava kategorije i proizvode jednim relation upitom; nema upita po
  kartici proizvoda (N+1). Postoje indeksi za `Product(categoryId)` i
  `Product(categoryId, isActive, isAvailable, sortOrder)`, kao i
  `Category(isActive, sortOrder)`.
- Checkout učitava sve proizvode iz korpe jednim `WHERE id IN (...)` upitom.

Offset paginacija je dovoljna za očekivanih 10k redova. Prelazak na cursor
paginaciju treba razmatrati tek kada produkciono merenje pokaže problem na
dubokim stranicama.

## Browser bundle i slike

- DB, auth i storage moduli ostaju iza `server-only` query/service granice i ne
  importuju se iz Client Components.
- `ProductCard` koristi `next/image`, `fill` i breakpoint-aware `sizes`; najveća
  deklarisana širina prati realnu širinu kartice u `max-w-7xl` gridu umesto
  širine viewporta.
- Interaktivni delovi ostaju mali Client Components (korpa i forme), dok su
  stranice, katalog i kartice Server Components.
- Korpa i checkout prikazuju lokalne loading state-ove tokom client hidratacije
  i učitavanja termina. Cache Components zadržavaju statički shell javnih ruta,
  dok privatne admin rute koriste request-time rendering.
- Nije dodat Redis, poseban CDN sloj niti nova runtime zavisnost.

## Verifikacija

Pokrenuti pre release-a:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Za realnu proveru baze pripremiti izolovanu test bazu sa najmanje 10.000
porudžbina i 100 aktivnih proizvoda, zatim preko `EXPLAIN (ANALYZE, BUFFERS)`
proveriti listu bez filtera, status filter, date range i poslednju dostupnu
stranicu. Seed se ne pokreće nad production bazom. U browser build analizi
proveriti da client chunkovi ne sadrže `@prisma`, `orm-postgres`, `pg`,
`better-auth` server adapter ili Vercel Blob write klijent.

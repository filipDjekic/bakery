# Administracija, porudžbine i poslovno vreme

Izmene su sprovedene direktno u postojećoj Next.js aplikaciji. `PROJECT_PLAN.md`
nije prisutan u repozitorijumu; korišćeni su `AGENTS.md`, postojeći servisi i
`docs/ARCHITECTURE.md`. Prisma 8 contract ostaje vlasnik fizičke šeme, a Prisma 7
projekcija za Better Auth ostaje usklađena.

## Implementirane funkcionalnosti

| Oblast                    | Rezultat                                                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Porudžbine                | Prisma ILIKE pretraga celog ili dela broja, status i lokalni datumi zajedno, 300 ms debounce, URL parametri, 25 rezultata, ukupan broj i stabilan redosled po datumu i ID-u.                                                                 |
| Aktivne porudžbine        | Kompaktne kartice na dashboard-u i operativnom prikazu, 10 po stranici, kupac/status/preuzimanje/cena/detalji, očuvan polling od 15 sekundi i kontekst stranice.                                                                             |
| Kašnjenje                 | `LATE` / „Kasni“, zaštićen serverski cron, jednokratni popust 15%, originalna i konačna cena, iznos i vreme popusta, atomska istorija. Terminalni statusi su isključeni.                                                                     |
| Proizvodi                 | Serverska pretraga naziva, kategorija, aktivnost, dostupnost i paginacija; validacija cene, slike i kategorije; kontrolisane jedinice prodaje.                                                                                               |
| Kategorije                | Serverska pretraga, aktivnost, ukupan broj, stabilna paginacija i postojeća potvrda deaktivacije.                                                                                                                                            |
| Slug                      | Automatski pregled, read-only polja, generisanje isključivo iz naziva na serveru, sufiksi pri kolizijama, očuvanje objavljenog sluga prilikom izmena.                                                                                        |
| Kreiranje                 | Serverski redirect na liste tek posle uspešnog upisa; greške ostavljaju unose u formi; zaštita od dvostrukog slanja.                                                                                                                         |
| Obaveštenja               | Zajednički success/error/warning/info sistem, 5 sekundi, slide-in/out, odvojene naslagane poruke, zatvaranje tastaturom, live regions i reduced-motion. Flash cookie prenosi poruku kroz serverski redirect.                                 |
| Pokrivenost obaveštenjima | Kreiranje/izmena proizvoda i kategorija, aktivacija/dostupnost, status porudžbine i ponovni pokušaji, podešavanja, prijava/odjava, korpa i checkout. Inline validacija ostaje uz polja.                                                      |
| Navigacija i prikaz       | Postojeći sidebar i mobilni meni ostaju prema ulogama; dodate su putanje stranica, aktivne javne stavke, kompaktniji razmaci, jasnije prazne liste i vizuelni status kašnjenja.                                                              |
| Vreme                     | Centralni Luxon parseri i formatteri, `dd.MM.yyyy. HH:mm`, 24 sata, `sr-Latn-RS`, timezone iz podešavanja, strogo razlikovanje kalendarskog datuma, lokalnog vremena i apsolutnog trenutka.                                                  |
| Radno vreme i DST         | Nedovršen unos ostaje tekst dok ne postane validan; validni minuti 0–1439, 1440 samo za kraj, više intervala, provera preklapanja i neradnih dana. DST praznine se preskaču; ponovljeni termini imaju zaseban UTC identitet i oznaku pomaka. |

## Konkretni uzroci

Administrativne forme koriste `useActionState` i `FormData`; React Hook Form se
koristi u checkout-u. Proizvod je podrazumevano bio aktivan, a servis je zahtevao
sliku, dok forma nije jasno označavala niti uslovno zahtevala sliku. Prazan ručni
slug predstavljao je dodatni blokator. Sada se slug automatski generiše, pravilo
za sliku je vidljivo i važi u formi i servisu, a Zod podaci se proveravaju pre
upload-a. Pravilo da aktivan proizvod mora imati sliku nije zaobiđeno. Za stvaran
upload potreban je podešen Blob storage; postojeći upload servis i njegove
provere tipa, veličine i dimenzija ostaju sačuvani.

Editor radnog vremena je svako pritiskanje tastera odmah pretvarao u broj i
ponovo formatirao. Delimičan unos mogao je postati NaN ili se neočekivano promeniti.
Sada postoji tekstualni nacrt, stroga konverzija i serverska ponovna validacija.
Datum/vreme prikazivali su se kroz više odvojenih formattera, sa različitim
formatima i ponegde hard-coded zonom. Oni sada koriste zajedničke funkcije.
Dosadašnje DST oznake nisu razlikovale dva jednaka lokalna termina, a granice
intervala mogle su biti normalizovane u nepostojeće ili pogrešno radno vreme.

Postojeća apsolutna polja već koriste PostgreSQL `timestamptz`; nije bila potrebna
migracija koja bi pomerala njihove vrednosti. `BusinessHours` ostaje weekday plus
lokalni minuti. Nova polja za popust takođe koriste UTC timestamp.

## Model i migracije

- `20261125T1404_late_orders_and_admin_indexes`: proširen status i statusna
  istorija, `originalTotalMinor`, `discountMinor`, `lateDiscountAt`, provera
  obračuna i indeksi za filtriranje i determinističko sortiranje.
- `20261125T1430_late_snapshot_integrity`: prisustvo originalne cene i vremena
  popusta mora biti usklađeno; `LATE` mora imati evidentiran popust.

Stari redovi dobijaju popust 0 i nullable nova polja; original se beleži pri
prvom kašnjenju. Postojeći `OrderItem` snapshot redovi se ne menjaju. Obračun je
integer half-up: `(originalMinor * 15 + 50) / 100`, sa BigInt aritmetikom.
Uslovni update statusa i upis istorije su u istoj transakciji, tako da konkurentni
radnici ili zaposleni ne mogu dvaput odobriti popust ili prepisati terminalni status.

Migracije menjaju CHECK ograničenja i indekse, bez brisanja poslovnih podataka.
Primenjene su na izolovanoj test bazi. Produkciona baza nije migrirana niti resetovana.

## Ključni fajlovi

- `src/prisma/contract.prisma`, generisani contract fajlovi i `migrations/`.
- `src/server/services/process-late-orders.ts`, `src/app/api/cron/late-orders/route.ts`, `vercel.json`.
- `src/server/queries/admin-{orders,products,categories,dashboard}.ts`.
- `src/lib/datetime.ts`, `src/lib/business-state.ts`, `src/server/services/pickup-slots.ts`.
- `src/lib/slug.ts`, product/category validacija i servisi za kreiranje/izmenu.
- `src/components/ui/list-{filters,pagination}.tsx`, `toast-provider.tsx`, `src/lib/toast.ts`.
- `src/features/admin-products/components/product-form.tsx`, category forma i editor radnog vremena.
- `src/server/http/flash-toast.ts`, akcije za kreiranje i `src/lib/use-preserved-form-action.ts`.
- `scripts/audit-datetime.ts` i novi unit/integration/E2E testovi.

## Integritet postojećih datuma

`node --experimental-strip-types scripts/audit-datetime.ts` radi isključivo u
read-only transakciji. Proverava fizičke tipove svih timestamp kolona, beskonačne
vrednosti, IANA zone i opsege radnog vremena, bez ispisivanja podataka kupaca.
Izvršen je nad postojećom konfigurisanom bazom: timestamp kolone su `timestamptz`,
nisu pronađene beskonačne vrednosti, nevalidne zone ili nevalidni opsezi sati.
Proveren je i izolovani test skup.

Ovaj audit ne može dokazati originalni željeni lokalni termin istorijskog zapisa.
Bez pouzdanog izvornog podatka nije opravdana korekcija za jedan ili dva sata.
Skripta nema apply režim i ne menja istoriju; nije izvršeno pomeranje timestampova.

## Provere i puštanje u rad

Provere nad završnim kodom:

| Provera                  | Rezultat                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`              | Prolazi, bez grešaka i upozorenja.                                                                                                                                                                          |
| `pnpm typecheck`         | Prolazi.                                                                                                                                                                                                    |
| `pnpm test`              | 63 fajla, 233 testa prolaze.                                                                                                                                                                                |
| `pnpm build`             | Produkcioni build prolazi, svih 25 stranica generisano.                                                                                                                                                     |
| Integraciona serija      | 106/106 prolazi na izolovanoj PostgreSQL bazi.                                                                                                                                                              |
| Dodatni LATE/DST testovi | 4/4 prolaze, uključujući ponovljeni lokalni sat sa dva različita UTC trenutka. Jedan je dodat posle pune serije: ukupno 107 različitih integracionih scenarija.                                             |
| Playwright               | Svih 20 različitih scenarija provereno na produkcionom buildu: 18 prolazi u punoj seriji, zatim 2/2 u ciljanoj ponovljenoj proveri posle ispravke test selektora i poštovanja prilagođenog porta test baze. |
| Responsive/a11y          | Prolazi pregled 13 javnih/admin ruta i login-a na 320, 360, 390, 768, 1024 i 1440 px; generisana 84 snimka; axe bez ozbiljnih/kritičnih nalaza.                                                             |
| Vremenske zone           | Unit i browser provere za Europe/Belgrade, UTC, America/New_York i Asia/Tokyo prolaze.                                                                                                                      |
| Migracije                | `migration:check`, kompletan izolovani migration replay, schema verify i migration status prolaze.                                                                                                          |
| Auth projekcija          | `schema:check` prolazi.                                                                                                                                                                                     |

Docker daemon nije bio dostupan, pa je pokrenut zaseban PostgreSQL 18 test
cluster u ignorisanom `.cache/` direktorijumu na loopback portu 54329. Testovi
nisu koristili produkcionu bazu. Browser provere su koristile produkcioni build
sa eksplicitnim lokalnim runtime profilom; nije izvršen deployment. Posle provera
lokalni test serveri su ugašeni.

Live upload na Vercel Blob nije izvršen: izolovano test okruženje nema Blob
token. Validacija datoteka, servis za upload, čišćenje neuspešnih upisa i kreiranje
aktivnog proizvoda sa validnom referencom slike provereni su postojećim unit i
integracionim testovima sa kontrolisanim storage adapterom. Stvarni provider i
prvo produkciono cron izvršavanje ostaju deo deployment smoke provere.

Za produkciju su potrebni pregledane migracije, `CRON_SECRET` i plan koji podržava
minutni cron. Operativni detalji i izvori su u [VERCEL_ENV.md](VERCEL_ENV.md).

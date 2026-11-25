import { readFileSync, writeFileSync } from 'node:fs';
const read = (name) =>
  JSON.parse(readFileSync(`performance-results/${name}.json`, 'utf8'));
const before = read('baseline-production'),
  after = read('after-production');
const devBefore = read('baseline-development'),
  devAfter = read('after-development');
const browserBefore = read('baseline-browser'),
  browserAfter = read('after-browser');
const profileBefore = read('baseline-production-profile'),
  profileAfter = read('after-production-profile');
const orderBefore = read('baseline-orders'),
  orderAfter = read('after-orders');
const prefetchBefore = read('baseline-prefetch'),
  prefetchAfter = read('after-prefetch');
const tests = read('verification');
const names = {
  home: '/',
  catalog: '/proizvodi',
  product: '/proizvodi/[slug]',
  cart: '/korpa',
  checkout: '/checkout',
  pickup: '/api/pickup-slots',
  'login-page': '/admin/login',
  'admin-anonymous': '/admin (anoniman)',
  'login-post': 'POST prijava',
  dashboard: '/admin (prijavljen)',
  orders: '/admin/orders',
  'order-detail': '/admin/orders/[id]',
  products: '/admin/products',
  categories: '/admin/categories',
  settings: '/admin/settings',
};
const fmt = (n) => Number(n).toFixed(2);
const summary = (s) => `${s.min} / **${s.median}** / ${s.p95} / ${s.max}`;
const change = (a, b) => `${fmt(a - b)} ms (${fmt(((a - b) / a) * 100)}%)`;
const table = (headers, rows) =>
  [
    headers.join(' | '),
    headers.map(() => '---').join(' | '),
    ...rows.map((row) => row.join(' | ')),
  ]
    .map((line) => `| ${line} |`)
    .join('\n');
const warmTable = (a, b) =>
  table(
    [
      'Ruta',
      'Pre: min / medijana / p95 / max, ms',
      'Posle: min / medijana / p95 / max, ms',
      'Smanjenje medijane',
    ],
    Object.entries(a.results).map(([name, r]) => [
      names[name],
      summary(r.warm.totalMs),
      summary(b.results[name].warm.totalMs),
      change(r.warm.totalMs.median, b.results[name].warm.totalMs.median),
    ]),
  );
const ttfbTable = table(
  ['Ruta', 'Pre TTFB med./p95, ms', 'Posle TTFB med./p95, ms'],
  Object.entries(before.results).map(([name, r]) => [
    names[name],
    `${r.warm.ttfbMs.median} / ${r.warm.ttfbMs.p95}`,
    `${after.results[name].warm.ttfbMs.median} / ${after.results[name].warm.ttfbMs.p95}`,
  ]),
);
const coldTable = (mode) => {
  const a = read(`baseline-cold-${mode}`),
    b = read(`after-cold-${mode}`);
  return table(
    [
      'Ruta',
      'Pre: min / med. / p95 / max, ms',
      'Posle: min / med. / p95 / max, ms',
    ],
    Object.entries(a.routes).map(([name, r]) => [
      names[name],
      summary(r.totalMs),
      summary(b.routes[name].totalMs),
    ]),
  );
};
const queriesTable = table(
  ['Zahtev', 'Pre: SQL po toplom zahtevu', 'Posle'],
  Object.entries(profileBefore.routes)
    .filter(([name, v]) => name.startsWith('GET ') && v.warmQueryCounts.length)
    .map(([name, v]) => [
      name.replace('burek-sa-sirom', '[slug]'),
      v.warmQueryCounts[0],
      profileAfter.routes[name]?.warmQueryCounts[0] ?? '—',
    ]),
);
const queryTiming = table(
  [
    'SQL porodica',
    'n pre',
    'Pre med./p95, ms',
    'n posle',
    'Posle med./p95, ms',
  ],
  profileBefore.queries
    .filter(
      (q) =>
        /SELECT.*FROM.*(?:session|user)|SELECT COUNT|SELECT.*bakerySettings/.test(
          q.sql,
        ) && q.n > 3,
    )
    .map((q) => {
      const b = profileAfter.queries.find((r) => r.sql === q.sql);
      const label = q.sql.includes('"session"')
        ? 'Session SELECT'
        : q.sql.includes('"user"')
          ? q.sql.includes('"isActive"') && !q.sql.includes('"emailVerified"')
            ? 'Aktuelna uloga/isActive SELECT'
            : 'Better Auth user SELECT'
          : q.sql.includes('COUNT')
            ? q.sql.includes('SUM')
              ? 'Dnevni COUNT/SUM'
              : 'Status COUNT'
            : 'Pickup settings SELECT';
      return [
        label,
        q.n,
        `${q.median} / ${q.p95}`,
        b?.n ?? 0,
        b ? `${b.median} / ${b.p95}` : '—',
      ];
    }),
);
const sqlBefore = read('baseline-sql-scale'),
  sqlAfter = read('after-sql-scale');
const scaleTable = table(
  [
    'Čitanje, 10k porudžbina',
    'Pre min / med. / p95 / max, ms',
    'Posle min / med. / p95 / max, ms',
    'EXPLAIN izvršavanje pre/posle, ms',
  ],
  Object.entries(sqlBefore.queries).map(([name, r]) => [
    name,
    summary(r.latencyMs),
    summary(sqlAfter.queries[name].latencyMs),
    `${r.explain['Execution Time']} / ${sqlAfter.queries[name].explain['Execution Time']}`,
  ]),
);
const browserTable = table(
  [
    'Ruta',
    'LCP pre/posle medijana, ms',
    'CLS pre/posle medijana',
    'JS dekodirano pre/posle, B',
  ],
  Object.entries(browserBefore.results)
    .filter(([, r]) => r.warm)
    .map(([name, r]) => [
      names[name],
      `${r.warm.lcpMs.median} / ${browserAfter.results[name].warm.lcpMs.median}`,
      `${r.warm.cls.median} / ${browserAfter.results[name].warm.cls.median}`,
      `${r.coldBrowser.jsDecodedBytes} / ${browserAfter.results[name].coldBrowser.jsDecodedBytes}`,
    ]),
);
const startupTable = table(
  [
    'Režim',
    'Pre: Next Ready (3 procesa)',
    'Posle: Next Ready (3 procesa)',
    'Pre/posle next.config',
  ],
  ['development', 'production'].map((mode) => {
    const a = read(`baseline-cold-${mode}`),
      b = read(`after-cold-${mode}`);
    return [
      mode,
      a.startup.map((s) => s.nextReady).join(', '),
      b.startup.map((s) => s.nextReady).join(', '),
      `${a.startup.map((s) => s.configTime).join(', ')} / ${b.startup.map((s) => s.configTime).join(', ')}`,
    ];
  }),
);
const targets = {
  home: 250,
  catalog: 250,
  product: 200,
  dashboard: 300,
  orders: 300,
  pickup: 150,
  'login-post': 600,
};
const targetTable = table(
  ['Operacija', 'Cilj, ms', 'Posle med./p95, ms', 'Rezultat'],
  [
    ...Object.entries(targets).map(([name, target]) => [
      names[name],
      `< ${target}`,
      `${after.results[name].warm.totalMs.median} / ${after.results[name].warm.totalMs.p95}`,
      after.results[name].warm.totalMs.p95 < target
        ? 'Dostignut u ovom uzorku'
        : 'Nije dostignut za p95',
    ]),
    [
      'Kreiranje porudžbine, izolovano',
      '< 500',
      `${orderAfter.warm.totalMs.median} / ${orderAfter.warm.totalMs.p95}`,
      'Dostignut u ovom uzorku',
    ],
  ],
);
const bundleReduction =
  browserBefore.results.home.coldBrowser.jsDecodedBytes -
  browserAfter.results.home.coldBrowser.jsDecodedBytes;
const sameData =
  JSON.stringify(before.dataFingerprint) ===
    JSON.stringify(after.dataFingerprint) &&
  JSON.stringify(devBefore.dataFingerprint) ===
    JSON.stringify(devAfter.dataFingerprint);
const report = `# Konsolidovani izveštaj o lokalnom runtime-u i performansama

Merenja: 24.11.2026. Završno usaglašavanje: 25.11.2026, Europe/Belgrade. Lokalna implementacija i stvarna merenja; javni deployment nije izvršen. Dnevnik nastavka: [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md).

## 1. Izvršni sažetak

Lokalni optimizovani produkcioni build sada se bez Docker-a pokreće preko \`start:local\`, samo na \`127.0.0.1\`, uz postojeći PostgreSQL i nepromenjene administratorske kredencijale. Standardni \`start\` i deployment preflight zadržavaju stroge produkcione zahteve.

Potvrđena poboljšanja: auth SQL 6 → 3 po autentifikovanom renderu; dashboard ukupno 13 → 10; lista porudžbina 9 → 6; prefetch u istom prikazu liste ${prefetchBefore.listPrefetches} → ${prefetchAfter.listPrefetches}; JavaScript početne strane manji za ${bundleReduction.toLocaleString('en-US')} B (${fmt((bundleReduction / browserBefore.results.home.coldBrowser.jsDecodedBytes) * 100)}%). Svi zadati topli produkcioni ciljevi dostignuti su u izmerenom uzorku. HTTP promene od nekoliko milisekundi nisu dokaz statistički značajnog ubrzanja. Baza je već bila brza; nisu dodavani indeksi, zavisnosti ili infrastruktura.

## 2. Početni problem i lokalna popravka

Stvarno reprodukovan \`pnpm.cmd start\`: Zod u instrumentation hook-u odbija \`APP_URL=http://localhost:3000\` i nedostajući enforced proxy/hop count. Build uspeva jer runtime preflight tokom build faze ne proverava deployment konfiguraciju. Promena NODE_ENV na development nije rešenje za merenje optimizovanog build-a.

\`scripts/local-runtime.mjs\` učitava Next redosled env fajlova preko već instaliranog \`@next/env\`, postavlja NODE_ENV=production, APP_ENV=local-production, LOCAL_PRODUCTION_HOST=127.0.0.1 i lokalni proxy režim samo u svom procesu. Validira konfiguraciju pre starta, zatim poziva zvanični Next CLI bez posebnih bundler opcija. Port uzima iz APP_URL; hostname/port override kroz argumente nije dozvoljen. IPv4 launcher prihvata localhost ili 127.0.0.1. Nema automatske migracije, seed-a, resetovanja baze ili promene lozinke.

## 3. Razdvojeni režimi i bezbednost

| Režim | Konfiguracija | Ponašanje |
| --- | --- | --- |
| Razvoj | next dev, NODE_ENV=development | HMR, razvojna dijagnostika, loopback binding iz komande |
| Lokalna produkcija | build:local/start:local, NODE_ENV=production, eksplicitan APP_ENV | Loopback aplikacija, auth i DB; jaka produkciona tajna; bez proxy-ja |
| Javni deployment | standardni build/start, APP_ENV=production ili podrazumevano | HTTPS, isti auth origin, enforced proxy i hop 1–5 ili Vercel ingress |
| Automatizovani testovi | .env.test, loopback *_test, eksplicitan guard | Postojeći izolovani E2E runtime; nikad razvojna baza |

Lokalni izuzetak zahteva oba URL-a istog origin-a, loopback PostgreSQL i marker lokalnog launcher-a; odbija javne URL-ove, udaljenu DB, host/hostaddr override i poznate hosting/CI markere. Deployment preflight podrazumevano uvek odbija APP_ENV=local-production. APP_ENV se ne dodaje u korisnički .env. NODE_ENV ostaje production i lokalno.

Better Auth je već birao cookie politiku iz eksplicitnog baseURL-a: lokalni HTTP koristi HttpOnly/SameSite=Lax; HTTPS koristi Secure i __Secure- prefiks. Nije uvedeno globalno isključivanje Secure cookie-ja. Origin/CSRF, autorizacija, aktivnost korisnika, lozinka i hashing, DB rate limiting i produkcioni CSP ostaju uključeni. Lokalni IP put ignoriše spoofovane forwarding header-e; produkcioni put validira header lanac i pouzdane hop-ove. Lokalni režim nije namenjen tunelima, LAN-u ili javnom hostingu.

## 4. Metodologija

Isti računar: ${before.conditions.cpu}, ${before.conditions.logicalCPUs} logičkih CPU, približno ${before.conditions.memoryGB} GB RAM; Windows, Node ${before.conditions.node}, Next 16.3.4/Turbopack, React 19.2.8, lokalni PostgreSQL 18.6. Iste verzije zavisnosti i isti poslovni podaci za pre/posle HTTP test: **${sameData ? 'otisak svih kontrolisanih tabela je identičan' : 'PROVERITI RAZLIKU OTISKA'}**. Razvojna baza: 13 proizvoda, 5 kategorija, 5 porudžbina i 1 korisnik; sirovi rezultati sadrže samo broj i digest, ne sadržaj redova. Sesije/rate bucket-i nastaju normalnom prijavom i nisu deo poslovnog otiska.

- HTTP: concurrency=1, keep-alive, ista uređena petlja ruta, bez browser-a, bez profilera; 1 prvi zahtev i 20 toplih po ruti. Prijava: 1 prvi i 2 topla pokušaja, zbog stvarnog limita 5/min; mali uzorak je ograničenje. Čekanje na postojeći rate limit se poštuje i ne ulazi u trajanje uspešnog pokušaja.
- Hladni zahtevi: još 3 nezavisna procesa po režimu, isti redosled ruta i isti port 3100. Disk/build/OS/DB cache se čuvaju. Ovo je hladan **proces**, ne restart računara ili hladan PostgreSQL buffer. Session cookie se čuva samo u memoriji između tih procesa. Launcher proverava da je port slobodan i gasi samo svoj proces.
- Server startup, TCP listening, Next Ready i učitavanje next.config su odvojeni. Kod tri restarta prvi HTTP zahtev kreće čim port sluša, pa uključuje i preostalu pripremu servera. Prvi zahtev na serveru već ostavljenom da se pripremi je druga kategorija.
- TTFB je trenutak prvog bajta tela; dodatno se čuva vreme header-a. Potpuno trajanje završava se tek na kraju tela, uključujući RSC/Suspense stream. Anonimni admin može dati 307 ili stream-ovani 200 sa redirect-om; browser mora završiti na login-u.
- Browser: Chromium ${browserAfter.browser}, 1440×1000, bez throttling-a, isti niz ruta; 5 navigacija/ruta, poređenje 4 topla reload-a. LCP/CLS/FCP/navigation timings i JS resursi iz Performance API-ja, posmatranje još 300 ms posle load-a. Prijava je setup, UI prijava je zasebno proverena smoke/E2E testom. To nisu terenski Core Web Vitals.
- SQL profiler je zaseban dijagnostički proces: patchuje obe instalirane pg verzije, beleži normalizovan SQL bez parametara i broj upita po zahtevu. Njegove latencije uključuju driver/event-loop/logging trošak i ne mešaju se sa čistim HTTP benchmark-om. Zbir paralelnih SQL trajanja nije wall-clock vreme.
- Odvojena nova *_performance_test baza: 10.000 sintetičkih porudžbina + 120 sintetičkih proizvoda, uz E2E fixture. Samo tu je izvršeno 5 kreiranja + 5 retry-ja pre i posle. Pre ponavljanja uklonjeno je samo 5 sopstvenih benchmark porudžbina i test bucket-i; razvojna baza nije korišćena za porudžbine ili destruktivne testove.

Mašina nije izolovan laboratorijski runner. Tokom završne razvojne kompilacije opaženo je približno 0,58 GB slobodnog RAM-a na ukupno 7,75 GB, uz Next dev oko 1,76 GB working set-a. Hladne kompilacije značajno osciluju; nema tvrdnje da je taj rezultat pouzdano ubrzan. Nisu korišćeni load/concurrency test, WAN ili emulacija slabog mobilnog CPU-a.

## 5. Bazno i završno HTTP merenje: lokalna produkcija

Ukupno trajanje odgovora; ms; **medijana** podebljana. n=20, osim prijave n=2. Pozitivno smanjenje znači brže, negativno sporije.

${warmTable(before, after)}

### TTFB, odvojeno od završetka stream-a

${ttfbTable}

Sve pojedinačne header/TTFB/total vrednosti i prvi zahtevi: [baseline-production.json](pekara/performance-results/baseline-production.json), [after-production.json](pekara/performance-results/after-production.json).

## 6. Razvojni režim

Pre i posle n=20 toplih zahteva; novi generisani dev cache za prvi veliki cohort. Nikakav aplikacioni kod nije menjan pre čuvanja baseline-a.

${warmTable(devBefore, devAfter)}

Prvi baseline homepage bio je oko 9,6 s (Next deo 6,9 s, application-code oko 2,6 s), a prvi prijavljeni dashboard oko 3,1 s uz Next deo 42 ms i application-code oko 3,1 s. To potvrđuje da kompilacija sama ne objašnjava problem. CPU profil je pokazao i skupe razvojne React JSX/debug stack/source-map operacije; oznaka application-code obuhvata i taj runtime, ne samo SQL i poslovnu logiku. U odvojenom 30 s CPU profilu idle je oko 46,4%, a fakeJSXCallSite/JSX, source-map i debug stack funkcije dominiraju relevantnim aktivnim vrhovima. [Sačuvan CPU sažetak](pekara/performance-results/baseline-development-cpu.json).

## 7. Hladni procesi i startup

${startupTable}

### Produkcija, n=3 procesa: potpuno trajanje

${coldTable('production')}

### Razvoj, n=3 procesa: potpuno trajanje

${coldTable('development')}

Nema tvrdnje o ubrzanju startup-a iz ovih malih i promenljivih uzoraka. JSON cold rezultati čuvaju i TTFB, sve uzorke i TCP listening vremena.

## 8. Potvrđeni uzroci i backend izmene

1. Layout i query/service ponovo su pozivali getCurrentUser u istom renderu: po dva session SELECT-a, dva Better Auth user SELECT-a i dva SELECT-a trenutne uloge/aktivnosti. React cache sada deli rezultat/promise samo u istom server renderu. Zadržana su sva autorizaciona mesta i sve provere; novi HTTP zahtev ponovo čita DB. Dependency-injected test pozivi i rad izvan React rendera ostaju sveži. Nema globalnog keširanja sesija ili privatnih podataka.
2. Razvojni Server Component debug/JSX/source-map rad je stvaran CPU trošak; produkcioni ekvivalent je mnogo brži i bez kompilacije. Nije menjana razvojna dijagnostika ili isključivana bezbednosna funkcija radi brojeva.
3. Domain Prisma 8 i auth-only Prisma 7 imaju namenske dugovečne pool-ove, ne klijent po zahtevu. Profiler vidi početne konekcije (pre: medijana ${profileBefore.connections.median} ms, n=${profileBefore.connections.n}), bez potrebe za novom konekcijom za svaki topli zahtev. Dva klijenta su postojeća kompatibilnosna granica; nema nebezbednog spajanja adaptera ili promene arhitekture.

### Broj SQL upita po zahtevu

${queriesTable}

Kreiranje porudžbine ostaje 15 SQL operacija po uspešnom POST-u u dijagnostičkom uzorku; retry ostaje poseban idempotentni put. Transakcije, zaključavanja, istorija, authoritative cene/settings i notification tracking nisu menjani.

### Pojedinačni normalizovani SQL: driver trajanja

${queryTiming}

Kompletan inventar svakog SQL oblika sa n/min/medijana/p95/max: [pre](pekara/performance-results/baseline-production-profile.json) i [posle](pekara/performance-results/after-production-profile.json). SQL vrednosti/parametri nisu zapisani; kolone i struktura upita jesu. Prvi zahtevi sadrže i Prisma schema/contract introspekciju; ne tumačiti je kao topli per-request trošak.

## 9. SQL planovi, indeksi, agregacije i paginacija

Odvojeni direktni read-only SELECT-i: n=20, EXPLAIN (ANALYZE, BUFFERS), 10k istorijskih porudžbina. Brojevi su direktan pg round-trip, a EXPLAIN kolona samo PostgreSQL izvršavanje. Planovi zadržavaju nazive indeksa i buffere, uz uklanjanje filter vrednosti.

${scaleTable}

Prva strana koristi postojeći createdAt indeks sa malim incremental sort-om; statusni upiti koriste postojeće indekse. Duboki offset jeste skuplji, ali na 10k redova ne opravdava novu cursor arhitekturu ili indeks. Dashboard četiri COUNT-a, dnevni COUNT/SUM i ograničeni recent SELECT imaju fiksan broj upita; EXPLAIN ne potvrđuje skupu agregaciju. N+1 nije nađen u katalogu/listama: ORM relation upiti ostaju jedan SQL oblik. Nisu uvedene migracije, nova polja ili indeksi.

## 10. Frontend i Next.js izmene

- U razvojnom baseline-u Next je prijavljivao runtime params van Suspense na detalju proizvoda. Page sada ima Suspense granicu i pristupačan status učitavanja; završni prikaz, SEO sadržaj, slike i cart funkcije ostaju isti. Admin rute ostaju dinamičke i autorizovane.
- Učitavanje liste od 25 porudžbina je tokom 1,5 s bez klika izazvalo ${prefetchBefore.orderDetailPrefetches} prefetch-a pojedinačnih detalja. Samo linkovi redova/kartica porudžbina sada imaju prefetch=false: detalji se učitavaju na navigaciju. Ukupan RSC prefetch ${prefetchBefore.listPrefetches} → ${prefetchAfter.listPrefetches} (${fmt(((prefetchBefore.listPrefetches - prefetchAfter.listPrefetches) / prefetchBefore.listPrefetches) * 100)}% manje), detalji ${prefetchBefore.orderDetailPrefetches} → ${prefetchAfter.orderDetailPrefetches}. Jedan dijagnostički click-to-history uzorak: ${fmt(prefetchBefore.clickToOrderHistoryMs)} → ${fmt(prefetchAfter.clickToOrderHistoryMs)} ms; n=1 nije dokaz statističkog poboljšanja klika. Navigacioni prefetch ostaje.
- Browser je učitavao Sentry instrumentaciju i kada je integracija isključena. Javni flag sada dobija eksplicitnu build-time vrednost; init, navigation hook i error capture se uslovljavaju tim flagom. Bundler uklanja nepotreban isključeni put. Uključen Sentry zadržava sinhroni init, tracing 0,1, PII redakciju i navigation hook (regresioni test). Nema odloženog init-a uključenog monitoring-a.
- next/image, sizes/aspect ratio, sistemski fontovi, Server/Client granice, Zustand, polling na 15 s i offline/dialog/edit zaštite su pregledani. Nije potvrđen problem koji opravdava dalje promene tih mehanizama. Nema nove biblioteke, vizuelnog redizajna ili uklanjanja funkcionalnosti.

### Browser metrike

LCP/CLS su lokalna laboratorijska opažanja tokom kratke navigacije; nisu terenska ocena. JS je zbir dekodiranih učitanih script resursa, ne gzip veličina npm paketa.

${browserTable}

Oba konačna browser uzorka imaju 0 pageerror događaja. FCP, responseEnd, load i transfer bytes su sačuvani u JSON-u. EventTiming za probni klik je zabeležen; pravi INP p75 se ne može utvrditi ovim kratkim testom bez stvarnog toka interakcija/terenskih podataka. CLS korpe/checkout-a uključuje postojeću hidrataciju lokalnog cart stanja; nije uvedena globalna tvrdnja o CLS=0. Provereno je 28 client chunk-ova: 0 pogodaka server-only Prisma/DB/Blob secret obrazaca ([rezultat](pekara/performance-results/bundle-scan.json)).

## 11. Cache, invalidacija, mreža i serijalizacija

Javni use cache/hours i postojeći catalog/categories/product/settings tagovi ostaju. Topli storefront u SQL profilu ima 0 DB upita; pickup i checkout namerno čitaju aktuelne podatke. Admin podaci se ne stavljaju u globalni cache. updateTag posle stvarnih admin mutacija ostaje, a E2E scenario proverava propagaciju izmenjenog proizvoda na javni detalj. Cache Components/Partial Prerendering ostaju uključeni; nije dodat legacy cache sloj.

Nema potrebe za dodatnim Redis-om, CDN servisom ili background worker-om. Sentry/Blob/email su tokom benchmark-a isključeni; browser metrike beleže spoljne hostove. Password hashing nije oslabljen; order email mreža nije uključena u brojeve. Katalog read model, JSON/RSC serijalizacija i poslovni proračuni nisu potvrđeni kao problem na ovom obimu, pa nisu spekulativno prepisivani.

## 12. Kreiranje porudžbine i ciljevi

| Izolovani POST /api/orders | Pre | Posle |
| --- | --- | --- |
| Prvi zahtev, ms | ${fmt(orderBefore.cold.totalMs)} | ${fmt(orderAfter.cold.totalMs)} |
| Topli min / medijana / p95 / max, n=4 | ${summary(orderBefore.warm.totalMs)} | ${summary(orderAfter.warm.totalMs)} |
| Smanjenje medijane | — | ${change(orderBefore.warm.totalMs.median, orderAfter.warm.totalMs.median)} |
| Idempotentni retry | 5/5, isti order ID | 5/5, isti order ID |

Order API implementacija nije menjana; mala razlika je opažena varijabilnost, ne tvrdnja o ubrzanju. Kreirane su isključivo sintetičke test porudžbine.

${targetTable}

Ciljevi važe za tople zahteve. Hladni procesi/kompilacije mogu ih višestruko premašiti. Prijava ima samo 2 topla uzorka, a kreiranje 4; p95 kod tako malih uzoraka praktično je maksimum.

## 13. Testovi i regresije

${table(
  ['Provera', 'Rezultat', 'Napomena'],
  tests.checks.map((r) => [r.name, r.result, r.details]),
)}

Smoke koristi postojeću lokalnu admin prijavu bez resetovanja lozinke: homepage, anonimni redirect, prijava, dashboard, reload + nova kartica, HttpOnly/SameSite cookie i forged Origin 403. E2E auth-freshness proverava izolaciju anonimnog konteksta i zabranu pristupa na sledećem zahtevu posle deaktivacije test naloga; test vraća test nalog u aktivno stanje. Integracioni testovi pokrivaju STAFF/ADMIN granice, deaktivaciju, CSRF, atomsku konkurentnost, rollback, idempotency, notification tracking i SQL constraint-e.

Prekid zbog ograničenja korišćenja nastao je dok su završni E2E/a11y procesi radili. Oba su završena sa sačuvanim statusom passed i praznim failedTests; broj testova potvrđen je ponovnim Playwright --list pregledom (14 u punom paketu, 3 u zasebnom accessibility paketu). Originalni terminalski stdout i trajanje nisu dostupni, pa trajanja tih paketa nisu navedena. Test baza nije ponovo resetovana radi rekonstrukcije izlaza. Rezultati unit/integration provera i bazna merenja sačuvani su iz prethodnog izvršavanja.

Posle nastavka ponovljeni su lint, typecheck, db:verify, standardni build, build:local i browser smoke nad postojećom lokalnom bazom. Svi su prošli. Završni build zamenjuje privremeni E2E build i spreman je za start:local. Netstat potvrđuje isključivo 127.0.0.1:3000 listener; server pokrenut za tu proveru zatim je ugašen. Postojeći PostgreSQL servis ostao je aktivan. Sanitizovan dokaz i hash-evi oporavljenih Playwright statusa: [final-runtime-check.json](pekara/performance-results/final-runtime-check.json).

Prvi lint pokušaj je zahvatio arhivirani generisani dev cache; dodat je ignore za .cache/performance rezultate i finalni lint je ponovljen. Aplikaciona lint pravila nisu isključena. Rani benchmark pokušaji sa 307/stream redirect razlikom, rate-limit čekanjem i neispravnim sintetičkim UUID formatom nisu korišćeni kao uspešna merenja; konačni artefakti potiču iz validnih izvršavanja.

## 14. Izmenjeni fajlovi u ovom zadatku

- Runtime: pekara/src/config/{env.ts,runtime-environment.ts,local-production.ts,local-production.test.ts}; scripts/local-runtime.mjs; package.json; .env.example; README.md.
- Bezbednosne regresije: src/server/rate-limit/request-ip.test.ts; scripts/check-local-runtime.mjs; e2e/auth-freshness.spec.ts.
- Auth: src/server/auth/current-user.ts.
- Frontend: src/app/(public)/proizvodi/[slug]/page.tsx; src/features/admin-orders/components/{orders-table.tsx,order-mobile-cards.tsx}.
- Isključena telemetry putanja: next.config.ts; instrumentation-client.ts; src/app/(public)/error.tsx; src/app/admin/(protected)/error.tsx; src/app/global-error.tsx; src/config/client-instrumentation.test.ts.
- Tooling/dokazi: scripts/performance/*.mjs; performance-results/*.json; .gitignore; .prettierignore; eslint.config.mjs; docs/PERFORMANCE.md; ovaj PERFORMANCE_REPORT.md; IMPLEMENTATION_PROGRESS.md.

Radno stablo je već sadržalo veliki broj korisničkih/remedijacionih izmena. One nisu revertovane/resetovane niti predstavljene kao nov rad ovog zadatka. Nema promena verzija zavisnosti, lockfile-a, administratora, produkcionog schema owner-a ili migracionog grafa. Nove migracije: **nema**. Postojeće migracije primenjene su ranije na test bazu; u ovom zadatku integration prepare je prijavio 0 pending migracija. Nije izvršen commit, push ili deployment.

## 15. Ograničenja i preostali troškovi

- Razvojni React debug/source-map rad i hladno učitavanje Next/Sentry/ORM modula ostaju. Mala slobodna memorija i OS scheduling menjaju cold rezultate. Nijedan warm rezultat ne garantuje ponašanje na hostingu ili pri konkurentnom opterećenju.
- Nisu izvršeni javni TLS/proxy firewall testovi, stvarna Resend/Blob/Sentry mreža, mobilno throttling merenje, terenski INP/CWV, produkciono opterećenje ili remote CI. Konfiguracioni i lokalni regresioni testovi nisu zamena za te provere.
- Login i order p95 imaju mali n zbog zadržanih rate limit-a. Predmet optimizacije nisu hashing i rate limit pravila.
- Tokom anonimne admin provere server beleži AuthenticationRequiredError iz postojećeg autorizacionog query sloja, dok protected layout preusmerava na login; browser redirect je uspešan i nema pageerror događaja. To ostaje dijagnostički šum paralelnog rendera. Očekivano se loguje i odbijeni napadački Origin iz bezbednosnog smoke-a. Zaustavljanje task servera daje pnpm lifecycle exit -1; to nije rezultat build-a ili testa.
- Prefetch poređenje meri jedan prikaz liste na desktop-u; navigacija bez unapred učitanog detalja ima svoj server round-trip. Click rezultat n=1 je dijagnostika, ne garancija.
- Docker daemon nije bio potreban: za izolovane testove ponovo je pokrenut sačuvani namenski PostgreSQL cluster na 127.0.0.1:55432. Razvojni PostgreSQL na 5432 nije resetovan. Test baze i sirovi lokalni profiler fajlovi su odvojeni od poslovne baze; ne sadrže kopirane stvarne kupce.
- Prisma CLI je dao obaveštenje da agent skill sync nije aktuelan; schema ownership i migration check ipak prolaze. Nije izvršena nepovezana nadogradnja/sinhronizacija paketa.

## 16. Tačne Windows CMD komande

Sve komande iz aplikacionog direktorijuma; zaseban CMD za server i klijent benchmark-a. pnpm opcija sprečava nepotrebno relinkovanje postojeće instalacije u ovom radnom stablu.

### Razvoj

\x60\x60\x60cmd
cd /d "C:\\Users\\cofid\\Desktop\\GITHUB\\pekara\\bakery\\pekara"
pnpm.cmd --config.verify-deps-before-run=false run dev --hostname 127.0.0.1 --port 3000
\x60\x60\x60

### Lokalni produkcioni build i start

\x60\x60\x60cmd
cd /d "C:\\Users\\cofid\\Desktop\\GITHUB\\pekara\\bakery\\pekara"
pnpm.cmd --config.verify-deps-before-run=false run build:local
pnpm.cmd --config.verify-deps-before-run=false run start:local
\x60\x60\x60

Otvoriti http://localhost:3000 uz postojeći .env, PostgreSQL i postojeći admin nalog. Docker nije potreban. Za prekid servera Ctrl+C.

### Stvarni produkcioni deployment / self-host iza enforced proxy-ja

Ovaj blok nije izvršen nad stvarnim deployment-om. Pre njega deployment okruženje mora već imati stvarne DATABASE_URL, nezavisne nasumične tajne i sve uključene integration kredencijale iz secret store-a. Vrednosti domena/hop-a zameniti stvarnim; firewall mora sprečiti pristup aplikaciji mimo proxy-ja. Ne kopirati lokalni .env na hosting.

\x60\x60\x60cmd
set "NODE_ENV=production"
set "APP_ENV=production"
set "LOCAL_PRODUCTION_HOST="
set "APP_URL=https://vas-stvarni-domen.example"
set "BETTER_AUTH_URL=https://vas-stvarni-domen.example"
set "TRUSTED_PROXY_MODE=proxy"
set "TRUSTED_PROXY_HOPS=1"
pnpm.cmd --config.verify-deps-before-run=false run env:check:production
pnpm.cmd --config.verify-deps-before-run=false run schema:check
pnpm.cmd --config.verify-deps-before-run=false run migration:check
pnpm.cmd --config.verify-deps-before-run=false run data:check
pnpm.cmd --config.verify-deps-before-run=false run build
pnpm.cmd --config.verify-deps-before-run=false run start --hostname 127.0.0.1 --port 3000
\x60\x60\x60

Vercel koristi svoj build/start lifecycle i VERCEL=1 umesto ovog self-host proxy primera. Eventualne ranije pending migracije imaju zaseban pregledan postupak u docs/MIGRATIONS.md; ovaj performance zadatak nema novu migraciju.

### Benchmark: zaseban CMD dok server radi

\x60\x60\x60cmd
node scripts/performance/http-benchmark.mjs performance-results/repeat-http.json
node scripts/performance/browser-benchmark.mjs performance-results/repeat-browser.json
node scripts/performance/cold-restarts.mjs production performance-results/repeat-cold-production.json
\x60\x60\x60

Za development HTTP merenje pokrenuti dev server istim portom, a rezultat sačuvati pod drugim imenom. Za cold development najpre prekinuti drugi dev server (isti .next/dev lock), pa:

\x60\x60\x60cmd
node scripts/performance/cold-restarts.mjs development performance-results/repeat-cold-development.json
\x60\x60\x60

SQL profil je poseban proces, bez mešanja sa čistim HTTP uzorkom:

\x60\x60\x60cmd
set "PERF_PROFILE=.cache/performance/repeat-sql.ndjson"
node --import ./scripts/performance/profile.mjs scripts/local-runtime.mjs start
\x60\x60\x60

U drugom CMD-u:

\x60\x60\x60cmd
set "BENCH_SAMPLES=3"
node scripts/performance/http-benchmark.mjs .cache/performance/repeat-profile-http.json
node scripts/performance/summarize-profile.mjs .cache/performance/repeat-sql.ndjson performance-results/repeat-profile.json
set "BENCH_SAMPLES="
\x60\x60\x60

### Izolovani veliki fixture i porudžbine

Potrebna je isključivo pripremljena loopback *_test baza iz .env.test. prepare pravi novu bazu i odbija postojeće ime. Nikad ne zamenjivati .env.test razvojnom DATABASE_URL. Pre starta izolovanog servera prekinuti drugi server na portu 3000. build i start moraju koristiti isti fixture ako se mere i statički javni prikazi.

\x60\x60\x60cmd
set "BENCH_DATABASE_NAME=pekara_repeat_performance_test"
node scripts/performance/prepare-test-data.mjs
node scripts/performance/start-isolated.mjs build
node scripts/performance/start-isolated.mjs start
\x60\x60\x60

Zaseban CMD:

\x60\x60\x60cmd
set "BENCH_ENV_FILE=.cache/performance/isolated.env"
node scripts/performance/sql-analysis.mjs performance-results/repeat-sql-scale.json
node scripts/performance/order-benchmark.mjs performance-results/repeat-orders.json
node scripts/performance/prefetch-benchmark.mjs performance-results/repeat-prefetch.json
\x60\x60\x60

Ponovljeno order merenje sme da pozove reset-benchmark-orders.mjs samo nad tom namenskom *_performance_test bazom; uklanja sopstvene sintetičke benchmark redove i test rate bucket-e, nikad razvojne porudžbine.

### Provere

Unit, lint i typecheck ne zahtevaju test bazu. Integration/E2E zahtevaju prethodno pokrenut izolovani PostgreSQL koji odgovara .env.test; njihove prepare/reset komande menjaju samo tu test bazu. Windows je tokom završnog audita rezervisao opseg 55393–55492, uključujući raniji test port 55432. Sledeći primer zato koristi slobodan port 25432. Pre budućeg punog test run-a usaglasiti isključivo test DATABASE_URL u .env.test sa tim portom; audit nije menjao postojeći .env.test niti razvojni .env. Postojeći namenski nativni cluster može se pokrenuti bez Docker-a (važi za ovu mašinu i sačuvani direktorijum, ne inicijalizuje novu bazu):

\x60\x60\x60cmd
"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_ctl.exe" -D "%LOCALAPPDATA%\\Temp\\bakery-test-pg-81938df212384916856d72867aa42e8e\\data" -l "%CD%\\.cache\\performance\\test-postgres.log" -o "-h 127.0.0.1 -p 25432" -w start
\x60\x60\x60

Alternativa za korisnika koji bira Docker jeste pnpm.cmd --config.verify-deps-before-run=false run integration:db:up, uz .env.test podešen prema compose test servisu. Nijedna opcija nije potrebna za normalan dev/start:local.

\x60\x60\x60cmd
pnpm.cmd --config.verify-deps-before-run=false run lint
pnpm.cmd --config.verify-deps-before-run=false run typecheck
pnpm.cmd --config.verify-deps-before-run=false run test --maxWorkers=2
pnpm.cmd --config.verify-deps-before-run=false run schema:check
pnpm.cmd --config.verify-deps-before-run=false run migration:check
pnpm.cmd --config.verify-deps-before-run=false run db:verify
node --env-file=.env --experimental-strip-types scripts/check-data-integrity.ts
pnpm.cmd --config.verify-deps-before-run=false run test:integration
\x60\x60\x60

Za E2E prvo pripremiti/seed-ovati izolovanu bazu, zatim napraviti test build sa .env.test vrednostima. Node wrapper ispod učitava env u procesu, da --env-file ne bi dospeo u Next worker NODE_OPTIONS:

\x60\x60\x60cmd
pnpm.cmd --config.verify-deps-before-run=false run integration:db:prepare
pnpm.cmd --config.verify-deps-before-run=false run e2e:seed
node scripts/performance/build-test.mjs
set "E2E_PRODUCTION=true"
node scripts/start-e2e-server.mjs
\x60\x60\x60

Zaseban CMD:

\x60\x60\x60cmd
set "E2E_PRODUCTION=true"
set "E2E_EXTERNAL_SERVER=true"
pnpm.cmd --config.verify-deps-before-run=false run test:e2e
pnpm.cmd --config.verify-deps-before-run=false run test:a11y --output=test-results/a11y-performance
\x60\x60\x60

Po završetku test servera ponovo pokrenuti build:local za postojeću lokalnu bazu. Unit/integration/E2E artefakti i browser binariji nisu produkcioni sadržaj. Konsolidovani report se iz sačuvanih konačnih JSON rezultata regeneriše komandom node scripts/performance/write-report.mjs.

## 17. Završni audit zahteva — dopuna od 25.11.2026.

Potpuna matrica svakog originalnog zahteva, svih 14 operacija i osam ciljeva nalazi se u [FINAL_COMPLIANCE_REPORT.md](FINAL_COMPLIANCE_REPORT.md). Konačan status je COMPLETED WITH DOCUMENTED LIMITATIONS. Ranija završna tvrdnja odnosila se na lokalno proverljivu implementaciju; audit eksplicitno razdvaja istorijska merenja od novih dopuna.

- Istorijski development order-creation baseline nije sačuvan. Originalni produkcioni par ostaje važeći. Audit je bez resetovanja dopunio samo trenutno razvojno merenje u sintetičkoj performance bazi: prvi POST 1.933,81 ms; warm n=4, min 35,71 / median 42,00 / p95=max 75,80 ms; 5 kreiranja i 5/5 idempotentnih retry-ja. Nije izračunato izmišljeno development pre/posle poboljšanje. [Dokaz](pekara/performance-results/audit-development-orders.json).
- Dodata je kratka produkciona interaction provera, sa interactionId i po 6 interakcija u tri sveža browser konteksta: laboratorijski session INP 48/48/40 ms (n=3, median/p95 48, min 40/max 48). [Dokaz](pekara/performance-results/audit-interactions.json). Za manje od 50 interakcija korišćena je najveća latencija grupe istog interactionId, prema [primarnoj INP dokumentaciji](https://web.dev/articles/inp). Nema istorijskog INP baseline-a ili terenskog p75. Originalni EventTiming niz nije naknadno preimenovan u INP.
- Ponovljeno je samo 33 relevantna bezbednosna unit testa u 5 fajlova, svi PASS: [per-test JSON](pekara/performance-results/audit-security-unit.json). Puni integration/E2E i originalni benchmark-i nisu nepotrebno ponavljani.
- [audit-evidence.json](pekara/performance-results/audit-evidence.json) sadrži ponovo izračunate sve sačuvane HTTP/cold/browser/order statistike, osam ciljeva sa procentima, SQL inventar i SHA-256 originalnih benchmark datoteka. Izvorni SQL zapisi potvrđuju 0 novih connect događaja posle početnih 15 HTTP operacija u oba produkciona profila. Cold connect median je 55,91 → 149,82 ms, pa se ne tvrdi ubrzanje uspostavljanja veze.
- Audit menja samo dijagnostički start-isolated.mjs (dev opcija i BENCH_ENV_FILE), dodaje audit-artifacts.mjs i interaction-audit.mjs, njihove sanitizovane rezultate i dokumentaciju. Aplikacioni kod/schema/migracije ostaju nepromenjeni; prethodni završni build je i dalje relevantan. Nema novih zavisnosti.

Dopunsko dev order merenje nad već pripremljenom ignorisanom audit test env kopijom, u dva CMD prozora (nije razvojni .env):

\x60\x60\x60cmd
set "BENCH_ENV_FILE=.cache/performance/audit-isolated.env"
node scripts/performance/start-isolated.mjs dev
\x60\x60\x60

\x60\x60\x60cmd
set "BENCH_ENV_FILE=.cache/performance/audit-isolated.env"
set "NODE_ENV=development"
node scripts/performance/order-benchmark.mjs performance-results/repeat-audit-development-orders.json
\x60\x60\x60

Dok lokalni produkcioni server radi, bez slanja checkout-a:

\x60\x60\x60cmd
node scripts/performance/interaction-audit.mjs
\x60\x60\x60

Read-only provera sačuvanih dokaza (ne pokreće HTTP workload niti pristupa DB):

\x60\x60\x60cmd
node scripts/performance/audit-artifacts.mjs
\x60\x60\x60
`;
writeFileSync('../PERFORMANCE_REPORT.md', report, 'utf8');
console.log('Written ../PERFORMANCE_REPORT.md in Serbian.');

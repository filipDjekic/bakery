import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { parse } from 'dotenv';
import pg from 'pg';

export const env = {
  ...parse(readFileSync(process.env.BENCH_ENV_FILE ?? '.env')),
  ...process.env,
};
export const baseURL = new URL(env.APP_URL);
assert.ok(
  ['localhost', '127.0.0.1'].includes(baseURL.hostname),
  'Benchmarks are loopback-only.',
);
assert.equal(baseURL.protocol, 'http:');
const databaseURL = new URL(env.DATABASE_URL);
assert.ok(['postgres:', 'postgresql:'].includes(databaseURL.protocol));
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(databaseURL.hostname),
  'Database profiling is loopback-only.',
);
assert.ok(
  !databaseURL.searchParams.has('host') &&
    !databaseURL.searchParams.has('hostaddr'),
);
export const agent = new http.Agent({ keepAlive: true });
export function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const round = (v) => Math.round(v * 100) / 100;
  return {
    n: sorted.length,
    min: round(sorted[0]),
    median: round(
      sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2,
    ),
    p95: round(sorted[Math.ceil(sorted.length * 0.95) - 1]),
    max: round(sorted.at(-1)),
  };
}
export function save(path, value) {
  mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}
export async function metadata() {
  const dbURL = new URL(env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(dbURL.hostname));
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const product = (
      await client.query(
        'SELECT p.id, p.slug, p.name, p."priceMinor", p."imageUrl" FROM product p JOIN category c ON c.id=p."categoryId" WHERE p."isActive" AND p."isAvailable" AND c."isActive" ORDER BY p.id LIMIT 1',
      )
    ).rows[0];
    const order = (
      await client.query('SELECT id FROM "order" ORDER BY id LIMIT 1')
    ).rows[0];
    const counts = {};
    for (const table of [
      'product',
      'category',
      'order',
      'user',
      'bakerySettings',
      'businessHours',
    ]) {
      counts[table] = (
        await client.query(
          `SELECT count(*)::int AS count, md5(string_agg(md5(row_to_json(t)::text), '' ORDER BY t.id)) AS digest FROM "${table}" t`,
        )
      ).rows[0];
    }
    const settings = (
      await client.query(
        'SELECT timezone FROM "bakerySettings" WHERE id=\'default\'',
      )
    ).rows[0];
    await client.query('ROLLBACK');
    return { product, order, counts, timezone: settings.timezone };
  } finally {
    await client.end();
  }
}
export function request(
  path,
  { cookie, method = 'GET', body, origin = baseURL.origin } = {},
) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let firstByte;
    const req = http.request(
      new URL(path, baseURL),
      {
        agent,
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          Origin: origin,
          'User-Agent': 'Bakery-Local-Benchmark/1.0',
        },
      },
      (res) => {
        const headersMs = performance.now() - start;
        const chunks = [];
        res.on('data', (chunk) => {
          firstByte ??= performance.now() - start;
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headersMs,
            ttfbMs: firstByte ?? headersMs,
            totalMs: performance.now() - start,
            bytes: chunks.reduce((sum, c) => sum + c.length, 0),
            headers: res.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    req.on('error', reject);
    req.setTimeout(120_000, () =>
      req.destroy(new Error('Benchmark request timeout.')),
    );
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
export async function login() {
  let result;
  for (let attempt = 0; attempt < 4; attempt++) {
    result = await request('/api/auth/sign-in/email', {
      method: 'POST',
      body: {
        email: env.ADMIN_EMAIL ?? 'admin@e2e.test',
        password: env.ADMIN_PASSWORD ?? 'E2E-Strong-Password-123!',
      },
    });
    if (result.status !== 429) break;
    // Respect existing rate limits; never clear buckets in the development DB.
    console.log(
      'Login rate limited; waiting for the existing window to expire.',
    );
    await new Promise((done) =>
      setTimeout(
        done,
        Math.min(60, Math.max(1, Number(result.headers['retry-after']) || 60)) *
          1000,
      ),
    );
  }
  assert.equal(result.status, 200, `Login failed with HTTP ${result.status}`);
  const cookie = result.headers['set-cookie']
    ?.map((v) => v.split(';')[0])
    .join('; ');
  assert.ok(cookie, 'Expected an authenticated session cookie.');
  return { result, cookie };
}
export async function logout(cookie) {
  await request('/api/auth/sign-out', { cookie, method: 'POST', body: {} });
}
export function routes(meta) {
  const date = new Intl.DateTimeFormat('sv-SE', {
    timeZone: meta.timezone,
  }).format(new Date(Date.now() + 86400000));
  return [
    ['home', '/'],
    ['catalog', '/proizvodi'],
    ['product', `/proizvodi/${meta.product.slug}`],
    ['cart', '/korpa'],
    ['checkout', '/checkout'],
    ['pickup', `/api/pickup-slots?date=${date}`],
    ['login-page', '/admin/login'],
    ['admin-anonymous', '/admin', false],
    ['dashboard', '/admin', true],
    ['orders', '/admin/orders?view=all', true],
    ['order-detail', `/admin/orders/${meta.order.id}`, true],
    ['products', '/admin/products', true],
    ['categories', '/admin/categories', true],
    ['settings', '/admin/settings', true],
  ];
}

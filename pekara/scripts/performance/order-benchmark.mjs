import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { env, metadata, request, save, stats, agent } from './common.mjs';
import pg from 'pg';
const dbURL = new URL(env.DATABASE_URL);
assert.ok(
  dbURL.pathname.endsWith('_test') && env.ALLOW_INTEGRATION_DB_RESET === 'true',
  'Order benchmarks require an explicitly enabled isolated *_test database.',
);
assert.equal(env.EMAIL_ENABLED, 'false');
assert.equal(env.BLOB_ENABLED, 'false');
const meta = await metadata();
const date = new Intl.DateTimeFormat('sv-SE', {
  timeZone: meta.timezone,
}).format(new Date(Date.now() + 86400000));
const slots = JSON.parse(
  (await request(`/api/pickup-slots?date=${date}`)).body,
).slots;
assert.ok(slots.length);
const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();
const samples = [];
try {
  for (let i = 0; i < 5; i++) {
    const payload = {
      idempotencyKey: randomUUID(),
      customerName: 'Performance Synthetic Test',
      customerPhone: '0641234567',
      pickupAt: slots[0].value,
      items: [
        {
          productId: meta.product.id,
          quantity: 1,
          displayPriceMinor: meta.product.priceMinor,
        },
      ],
    };
    const res = await request('/api/orders', { method: 'POST', body: payload });
    assert.equal(
      res.status,
      201,
      `Isolated creation failed: HTTP ${res.status}`,
    );
    samples.push({ ttfbMs: res.ttfbMs, totalMs: res.totalMs });
    const retry = await request('/api/orders', {
      method: 'POST',
      body: payload,
    });
    assert.equal(retry.status, 200);
    assert.equal(JSON.parse(res.body).orderId, JSON.parse(retry.body).orderId);
  }
  save(process.argv[2], {
    isolated: true,
    externalIntegrations: false,
    samples,
    cold: samples[0],
    warm: {
      ttfbMs: stats(samples.slice(1).map((s) => s.ttfbMs)),
      totalMs: stats(samples.slice(1).map((s) => s.totalMs)),
    },
    idempotentRetries: '5/5 identical order IDs',
  });
  console.log(
    'Isolated order benchmark: 5 creations + 5 idempotent retries PASS.',
  );
} finally {
  // Only this dedicated benchmark database; retain created orders as evidence.
  await client.end();
  agent.destroy();
}

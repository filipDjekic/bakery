import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createIntegrationPool, getIntegrationDatabaseUrl } from './db.ts';

const control = createIntegrationPool();
const name = `bakery_functional_${crypto.randomUUID().replaceAll('-', '')}_test`;
const url = new URL(getIntegrationDatabaseUrl());
url.pathname = `/${name}`;
getIntegrationDatabaseUrl({ ...process.env, DATABASE_URL: url.toString() });
let fixture: Pool | undefined;
function migrate(to?: string) {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL('../../node_modules/prisma/dist/prisma.js', import.meta.url),
      ),
      'db',
      'migrate',
      '--yes',
      ...(to ? ['--to', to] : []),
    ],
    { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8' },
  );
  if (result.error || result.status !== 0)
    throw new Error('Isolated migration failed.');
}
try {
  assert.match(name, /^bakery_functional_[a-f0-9]{32}_test$/);
  await control.query(`CREATE DATABASE "${name}"`);
  fixture = new Pool({ connectionString: url.toString() });
  migrate('0ac919db64d2b4147a64590cff79641695f03357dc43d5870b7191ee90813647');
  const ids: string[] = [];
  for (const stage of [
    'NEW',
    'ACCEPTED',
    'IN_PREPARATION',
    'READY',
    'UNKNOWN',
    'COMPLETED',
  ]) {
    const id = crypto.randomUUID();
    ids.push(id);
    await fixture.query(
      `INSERT INTO "order" (id,"orderNumber","idempotencyKey","payloadHash",status,"customerName","customerPhone","pickupAt","currencyCode","subtotalMinor","totalMinor","originalTotalMinor","discountMinor","lateDiscountAt","createdAt","updatedAt") VALUES ($1,$2,$3,'test',$4,'Test','+381641234567','2026-11-25T10:00:00Z','RSD',10000,8500,10000,1500,'2026-11-25T11:00:00Z','2026-11-25T09:00:00Z','2026-11-25T11:00:00Z')`,
      [
        id,
        `MIG-${stage}`,
        crypto.randomUUID(),
        stage === 'COMPLETED' ? stage : 'LATE',
      ],
    );
    if (stage !== 'UNKNOWN' && stage !== 'COMPLETED')
      await fixture.query(
        `INSERT INTO "orderStatusHistory" (id,"orderId","fromStatus","toStatus","createdAt") VALUES ($1,$2,$3,'LATE','2026-11-25T11:00:00Z')`,
        [crypto.randomUUID(), id, stage],
      );
    if (stage === 'READY')
      await fixture.query(
        `INSERT INTO "orderStatusHistory" (id,"orderId","fromStatus","toStatus","createdAt") VALUES ($1,$2,'IN_PREPARATION','READY','2026-11-25T09:30:00Z')`,
        [crypto.randomUUID(), id],
      );
    await fixture.query(
      `INSERT INTO "orderItem" (id,"orderId","productName","unitPriceMinor",quantity,"subtotalMinor","createdAt") VALUES ($1,$2,'Snapshot',5000,2,10000,'2026-11-25T09:00:00Z')`,
      [crypto.randomUUID(), id],
    );
  }
  const itemsBefore = (
    await fixture.query(
      'SELECT id,"orderId","productName","unitPriceMinor",quantity,"subtotalMinor","createdAt" FROM "orderItem" ORDER BY id',
    )
  ).rows;
  await fixture.query(
    `INSERT INTO "orderNotificationDelivery" (id,"orderId","recipientType",status,attempts,"leaseUntil","createdAt","updatedAt") VALUES ($1,$2,'customer','SENDING',5,'2026-11-25T11:00:00Z','2026-11-25T09:00:00Z','2026-11-25T11:00:00Z')`,
    [crypto.randomUUID(), ids[0]],
  );
  migrate();
  const orders = (
    await fixture.query('SELECT * FROM "order" ORDER BY "orderNumber"')
  ).rows;
  for (const row of orders) {
    const stage = row.orderNumber.slice(4);
    assert.equal(row.status, stage === 'UNKNOWN' ? 'NEW' : stage);
    assert.equal(row.totalMinor, 8500);
    assert.equal(row.discountMinor, 1500);
    assert.equal(row.originalTotalMinor, 10000);
    if (stage === 'READY')
      assert.equal(row.readyAt.toISOString(), '2026-11-25T09:30:00.000Z');
  }
  assert.deepEqual(
    (
      await fixture.query(
        'SELECT id,"orderId","productName","unitPriceMinor",quantity,"subtotalMinor","createdAt" FROM "orderItem" ORDER BY id',
      )
    ).rows,
    itemsBefore,
  );
  assert.equal(
    (
      await fixture.query(
        `SELECT count(*)::int AS count FROM "orderStatusHistory" WHERE reason LIKE 'Migracija:%'`,
      )
    ).rows[0].count,
    5,
  );
  const delivery = (
    await fixture.query('SELECT * FROM "orderNotificationDelivery"')
  ).rows[0];
  assert.equal(delivery.status, 'FAILED');
  assert.equal(delivery.lastErrorCode, 'EMAIL_ORIGINAL_PAYLOAD_UNAVAILABLE');
  const count = (
    await fixture.query(
      'SELECT count(*)::int AS count FROM "orderStatusHistory"',
    )
  ).rows[0].count;
  migrate();
  assert.equal(
    (
      await fixture.query(
        'SELECT count(*)::int AS count FROM "orderStatusHistory"',
      )
    ).rows[0].count,
    count,
  );
  console.info(
    'Data-bearing isolated upgrade passed: stages, missing history, terminal totals, readiness, item snapshots, legacy leases and repeat execution.',
  );
} finally {
  await fixture?.end();
  if (fixture) await control.query(`DROP DATABASE "${name}"`);
  await control.end();
}

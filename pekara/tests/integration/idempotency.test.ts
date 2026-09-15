import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { createCheckoutPayloadHash } from '../../src/lib/payload-hash.ts';
import { db } from '../../src/prisma/db.ts';
import {
  executeIdempotently,
  IdempotencyConflictError,
  type IdempotencyRecord,
} from '../../src/server/services/idempotency.ts';
import { checkoutRequestSchema } from '../../src/validation/checkout.ts';

const FIRST_PRODUCT_ID = '2b5e1eb1-a026-4b90-9f80-b0e189741686';
const SECOND_PRODUCT_ID = '53276ac7-9ea9-4eb2-b0f4-a29d10b7701f';
const createdIdempotencyKeys: string[] = [];

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

after(async () => {
  if (createdIdempotencyKeys.length > 0) {
    await db.orm.public.Order.where((order) =>
      order.idempotencyKey.in(createdIdempotencyKeys),
    ).deleteAll();
  }

  await db.runtime().close();
});

function request(
  items = [
    { productId: FIRST_PRODUCT_ID, quantity: 2 },
    { productId: SECOND_PRODUCT_ID, quantity: 1 },
  ],
) {
  return checkoutRequestSchema.parse({
    idempotencyKey: '4ef40ca4-a006-477a-9512-7af773afea45',
    customerName: 'Petar Petrović',
    customerPhone: '064 123 4567',
    customerEmail: '',
    note: '',
    pickupAt: '2026-09-18T08:30:00.000Z',
    items,
  });
}

test('payload hash is deterministic and ignores item ordering and idempotency key', () => {
  const original = request();
  const reordered = request([...original.items].reverse());

  assert.equal(
    createCheckoutPayloadHash(original),
    createCheckoutPayloadHash({
      ...reordered,
      idempotencyKey: '56f679c4-e983-44fd-a28d-145bc01f48f7',
    }),
  );
  assert.notEqual(
    createCheckoutPayloadHash(original),
    createCheckoutPayloadHash({ ...original, customerName: 'Drugo ime' }),
  );
});

test('same key and hash return the existing order while changed payload conflicts', async () => {
  const existing = {
    payloadHash: 'same-hash',
    value: { id: 'order-1' },
  };
  let creates = 0;
  const findExisting = async () => existing;

  const duplicate = await executeIdempotently({
    idempotencyKey: 'key-1',
    payloadHash: 'same-hash',
    findExisting,
    create: async () => {
      creates += 1;
      return { id: 'order-2' };
    },
    isUniqueConflict: () => false,
  });

  assert.deepEqual(duplicate, {
    kind: 'existing',
    value: { id: 'order-1' },
  });
  assert.equal(creates, 0);
  await assert.rejects(
    executeIdempotently({
      idempotencyKey: 'key-1',
      payloadHash: 'different-hash',
      findExisting,
      create: async () => ({ id: 'order-2' }),
      isUniqueConflict: () => false,
    }),
    IdempotencyConflictError,
  );
});

test('parallel same-key requests converge on one created order after unique race', async () => {
  type Order = { id: string };
  const uniqueConflict = Symbol('unique-conflict');
  const payloadHash = 'same-hash';
  let stored: IdempotencyRecord<Order> | null = null;
  let persistedOrders = 0;

  const findExisting = async () => stored;
  const create = async (): Promise<Order> => {
    await Promise.resolve();

    if (stored) {
      throw uniqueConflict;
    }

    const value = { id: 'order-1' };
    stored = { payloadHash, value };
    persistedOrders += 1;
    return value;
  };
  const calls = Array.from({ length: 10 }, () =>
    executeIdempotently({
      idempotencyKey: 'key-1',
      payloadHash,
      findExisting,
      create,
      isUniqueConflict: (error) => error === uniqueConflict,
    }),
  );
  const results = await Promise.all(calls);

  assert.equal(persistedOrders, 1);
  assert.deepEqual(
    results.map((result) => result.value.id),
    Array.from({ length: 10 }, () => 'order-1'),
  );
  assert.equal(results.filter((result) => result.kind === 'created').length, 1);
});

test('database unique race persists one order for parallel same-key requests', async () => {
  const idempotencyKey = crypto.randomUUID();
  const payloadHash = 'database-race-same-hash';
  createdIdempotencyKeys.push(idempotencyKey);

  const findExisting = async () => {
    const existing = await db.orm.public.Order.select('id', 'payloadHash')
      .where({ idempotencyKey })
      .first();

    return existing
      ? {
          payloadHash: existing.payloadHash,
          value: { id: existing.id },
        }
      : null;
  };
  const create = async () => {
    const created = await db.orm.public.Order.select('id').create({
      orderNumber: varchar(`T-${crypto.randomUUID().slice(0, 20)}`, 32),
      idempotencyKey,
      payloadHash,
      customerName: varchar('Idempotency test', 100),
      customerPhone: varchar('+381641234567', 20),
      customerEmail: null,
      note: null,
      pickupAt: '2026-09-18T08:30:00.000Z',
      currencyCode: varchar('RSD', 3),
      subtotalMinor: 100,
      totalMinor: 100,
      cancellationReason: null,
    });

    return { id: created.id };
  };
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      executeIdempotently({
        idempotencyKey,
        payloadHash,
        findExisting,
        create,
        isUniqueConflict: () => true,
      }),
    ),
  );
  const persisted = await db.orm.public.Order.where({
    idempotencyKey,
  }).aggregate((aggregate) => ({ count: aggregate.count() }));

  assert.equal(persisted.count, 1);
  assert.equal(new Set(results.map((result) => result.value.id)).size, 1);
});

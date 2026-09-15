import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { db } from '../../src/prisma/db.ts';
import { deleteExpiredRateLimitBuckets } from '../../src/server/repositories/rate-limit.ts';
import {
  createClientFingerprint,
  getClientIpFromTrustedHeader,
  MissingClientIpError,
  normalizeClientIp,
} from '../../src/server/rate-limit/fingerprint.ts';
import {
  consumeRateLimit,
  enforceOrderCreateRateLimit,
  OrderRateLimitExceededError,
} from '../../src/server/rate-limit/order-rate-limit.ts';

const testRunId = crypto.randomUUID();
const fingerprints: string[] = [];

function fingerprint(): string {
  const value = `test-rate-limit-${testRunId}-${fingerprints.length}`;
  fingerprints.push(value);
  return value;
}

after(async () => {
  await db.orm.public.ActionRateLimitBucket.where((bucket) =>
    bucket.keyHash.in(fingerprints),
  ).deleteAll();
  await db.runtime().close();
});

test('normalizes trusted IPv4 and IPv6 addresses before HMAC fingerprinting', () => {
  const secret = 'test-secret-with-at-least-32-bytes-long';
  const expandedIpv6 = normalizeClientIp('2001:0db8:0:0:0:0:0:1');
  const compactIpv6 = normalizeClientIp('[2001:db8::1]:443');

  assert.equal(normalizeClientIp('192.168.001.010:8080'), null);
  assert.equal(normalizeClientIp('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(expandedIpv6, '2001:db8::1');
  assert.equal(compactIpv6, expandedIpv6);
  assert.equal(
    createClientFingerprint(expandedIpv6!, secret),
    createClientFingerprint(compactIpv6!, secret),
  );
  assert.equal(
    getClientIpFromTrustedHeader(
      new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }),
    ),
    '203.0.113.10',
  );
  assert.throws(
    () => getClientIpFromTrustedHeader(new Headers()),
    MissingClientIpError,
  );
});

test('activates the limit and returns retry metadata', async () => {
  const keyHash = fingerprint();
  const policy = { limit: 5, windowSeconds: 600 };
  const now = new Date('2026-09-15T10:01:00.000Z');

  for (let attempt = 1; attempt <= policy.limit; attempt += 1) {
    const result = await consumeRateLimit('test:order', keyHash, policy, now);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, policy.limit - attempt);
  }

  const rejected = await consumeRateLimit('test:order', keyHash, policy, now);
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.remaining, 0);
  assert.equal(rejected.retryAfterSeconds, 540);
  assert.equal(rejected.resetAt, '2026-09-15T10:10:00.000Z');
});

test('concurrent requests cannot exceed an atomic bucket limit', async () => {
  const keyHash = fingerprint();
  const policy = { limit: 5, windowSeconds: 3600 };
  const now = new Date('2026-09-15T10:00:00.000Z');
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      consumeRateLimit('test:concurrent', keyHash, policy, now),
    ),
  );

  assert.equal(results.filter((result) => result.allowed).length, policy.limit);
  assert.equal(results.filter((result) => !result.allowed).length, 15);

  const bucket = await db.orm.public.ActionRateLimitBucket.where({
    keyHash,
    action: 'test:concurrent',
    windowStart: now.toISOString(),
    windowSeconds: policy.windowSeconds,
  }).first();
  assert.equal(bucket?.count, 20);
});

test('expired buckets are cleaned up without touching active buckets', async () => {
  const expiredKey = fingerprint();
  const activeKey = fingerprint();

  await db.orm.public.ActionRateLimitBucket.createAll([
    {
      keyHash: expiredKey,
      action: 'test:cleanup',
      windowStart: '2026-09-15T08:00:00.000Z',
      windowSeconds: 600,
      count: 1,
      expiresAt: '2026-09-15T08:10:00.000Z',
    },
    {
      keyHash: activeKey,
      action: 'test:cleanup',
      windowStart: '2026-09-15T10:00:00.000Z',
      windowSeconds: 600,
      count: 1,
      expiresAt: '2026-09-15T10:10:00.000Z',
    },
  ]);

  await deleteExpiredRateLimitBuckets('2026-09-15T09:00:00.000Z');

  assert.equal(
    await db.orm.public.ActionRateLimitBucket.where({
      keyHash: expiredKey,
    }).first(),
    null,
  );
  assert.ok(
    await db.orm.public.ActionRateLimitBucket.where({
      keyHash: activeKey,
    }).first(),
  );
});

test('combined order policy exposes 429 and Retry-After metadata', async () => {
  const keyHash = fingerprint();
  const now = new Date('2026-09-15T10:01:00.000Z');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const results = await enforceOrderCreateRateLimit(keyHash, now);
    assert.deepEqual(
      results.map(({ limit }) => limit),
      [5, 20],
    );
  }

  await assert.rejects(
    enforceOrderCreateRateLimit(keyHash, now),
    (error: unknown) =>
      error instanceof OrderRateLimitExceededError &&
      error.status === 429 &&
      error.retryAfterSeconds === 540,
  );
});

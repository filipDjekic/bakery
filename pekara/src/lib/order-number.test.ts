import assert from 'node:assert/strict';
import { test } from 'vitest';

import { DateTime } from 'luxon';

import { generateOrderNumber } from './order-number.ts';

test('uses the bakery local date around a UTC day boundary', () => {
  const now = DateTime.fromISO('2026-01-01T23:30:00.000Z');
  assert.match(
    generateOrderNumber(now, 'Europe/Belgrade'),
    /^PK-260102-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/,
  );
});

test('rejects invalid instants and timezones', () => {
  assert.throws(() =>
    generateOrderNumber(DateTime.invalid('test'), 'Europe/Belgrade'),
  );
  assert.throws(() =>
    generateOrderNumber(DateTime.utc(), 'Not/A-Timezone'),
  );
});

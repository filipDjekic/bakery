import assert from 'node:assert/strict';
import { test } from 'vitest';

import { normalizeCustomerPhone } from './phone.ts';

test('normalizes Serbian domestic and international phone formats to E.164', () => {
  assert.equal(normalizeCustomerPhone('064 123 45 67'), '+381641234567');
  assert.equal(normalizeCustomerPhone('+381 (11) 123-4567'), '+381111234567');
});

test('rejects blank, incomplete and malformed numbers', () => {
  assert.equal(normalizeCustomerPhone('   '), null);
  assert.equal(normalizeCustomerPhone('064 12'), null);
  assert.equal(normalizeCustomerPhone('not-a-phone'), null);
});

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { calculateMoneyTotalMinor, formatRsd } from './money.ts';

test('calculates totals exclusively in integer minor units', () => {
  assert.equal(
    calculateMoneyTotalMinor([
      { unitPriceMinor: 12_550, quantity: 2 },
      { unitPriceMinor: 8_000, quantity: 3 },
    ]),
    49_100,
  );
  assert.match(formatRsd(49_100), /491[,.]00/);
});

test('accepts the maximum and rejects overflow or invalid money', () => {
  assert.equal(
    calculateMoneyTotalMinor([{ unitPriceMinor: 500, quantity: 2 }], 1_000),
    1_000,
  );
  assert.throws(
    () =>
      calculateMoneyTotalMinor(
        [{ unitPriceMinor: 501, quantity: 2 }],
        1_000,
      ),
    RangeError,
  );
  assert.throws(
    () => calculateMoneyTotalMinor([{ unitPriceMinor: 1.5, quantity: 1 }]),
    TypeError,
  );
  assert.throws(() => formatRsd(Number.MAX_SAFE_INTEGER + 1), TypeError);
});

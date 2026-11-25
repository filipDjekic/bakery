import { it, expect } from 'vitest';
import { calculateLateDiscount } from './order-discount';
it('rounds 15 percent half-up in integer minor units', () => {
  for (const [original, discount] of [
    [100000, 15000],
    [0, 0],
    [1, 0],
    [10, 2],
    [11, 2],
    [2147483647, 322122547],
  ]) {
    expect(calculateLateDiscount(original!)).toBe(discount);
  }
  expect(() => calculateLateDiscount(-1)).toThrow();
  expect(() => calculateLateDiscount(1.5)).toThrow();
});

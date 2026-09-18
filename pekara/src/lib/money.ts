const MINOR_UNITS_PER_MAJOR_UNIT = 100;

const rsdFormatter = new Intl.NumberFormat('sr-Latn-RS', {
  style: 'currency',
  currency: 'RSD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatRsd(minorUnits: number): string {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new TypeError('Money amount must be a safe integer in minor units.');
  }

  return rsdFormatter.format(minorUnits / MINOR_UNITS_PER_MAJOR_UNIT);
}

type MoneyLine = {
  unitPriceMinor: number;
  quantity: number;
};

export function calculateMoneyTotalMinor(
  lines: readonly MoneyLine[],
  maximumTotalMinor = Number.MAX_SAFE_INTEGER,
): number {
  if (!Number.isSafeInteger(maximumTotalMinor) || maximumTotalMinor < 0) {
    throw new TypeError('Maximum money total must be a non-negative safe integer.');
  }

  let totalMinor = 0;

  for (const { unitPriceMinor, quantity } of lines) {
    if (
      !Number.isSafeInteger(unitPriceMinor) ||
      unitPriceMinor < 0 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0
    ) {
      throw new TypeError(
        'Money lines require non-negative safe integer prices and quantities.',
      );
    }

    const subtotalMinor = unitPriceMinor * quantity;
    const nextTotalMinor = totalMinor + subtotalMinor;

    if (
      !Number.isSafeInteger(subtotalMinor) ||
      !Number.isSafeInteger(nextTotalMinor) ||
      nextTotalMinor > maximumTotalMinor
    ) {
      throw new RangeError('Money total exceeds the supported limit.');
    }

    totalMinor = nextTotalMinor;
  }

  return totalMinor;
}

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

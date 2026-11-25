export function calculateLateDiscount(originalMinor: number): number {
  if (!Number.isSafeInteger(originalMinor) || originalMinor < 0)
    throw new Error('Invalid original total');
  return Number(
    (BigInt(originalMinor) * BigInt(15) + BigInt(50)) / BigInt(100),
  );
}

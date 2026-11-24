/** Parse decimal dinars using integer arithmetic; grouping/exponents are rejected. */
export function parseRsdInput(value: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount =
    BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? '').padEnd(2, '0'));
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}
export function formatRsdInput(minor: number): string {
  return `${Math.floor(minor / 100)},${String(minor % 100).padStart(2, '0')}`;
}

import { formatRsd } from '@/lib/money';
export function OrderPrice({
  totalMinor,
  originalTotalMinor,
  discountMinor = 0,
}: {
  totalMinor: number;
  originalTotalMinor?: number | null;
  discountMinor?: number;
}) {
  return (
    <span className="inline-flex flex-col tabular-nums">
      {originalTotalMinor != null ? (
        <span className="text-xs font-normal text-red-800">
          <span className="sr-only">Originalna cena: </span>
          <s>{formatRsd(originalTotalMinor)}</s>
          <span className="block">Popust 15%: −{formatRsd(discountMinor)}</span>
        </span>
      ) : null}
      <strong>{formatRsd(totalMinor)}</strong>
    </span>
  );
}

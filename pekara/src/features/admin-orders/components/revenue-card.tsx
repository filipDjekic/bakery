type RevenueCardProps = {
    revenueMinor: number;
}

export function RevenueCard({ revenueMinor }: RevenueCardProps) {
    return (
        <article className="border-border bg-surface rounded-x1 border p-5">
            <p className="text-muted text-sm font-medium">
                Današnji prihod
            </p>

            <p className="mt-2 text-3xl font-bold tabular-nums">
                {(revenueMinor / 100).toLocaleString('sr-RS')} RSD
            </p>
        </article>
    );
}
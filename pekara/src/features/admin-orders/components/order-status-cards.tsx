import type { AdminDashboardData } from '@/server/queries/admin-dashboard';

type OrderStatusCardsProps = {
  counts: AdminDashboardData['counts'];
};

const cards: Array<{
  key: keyof AdminDashboardData['counts'];
  label: string;
  tone: string;
}> = [
  { key: 'NEW', label: 'Nove', tone: 'text-blue-700' },
  { key: 'ACCEPTED', label: 'Prihvaćene', tone: 'text-violet-700' },
  { key: 'IN_PREPARATION', label: 'U pripremi', tone: 'text-amber-700' },
  { key: 'READY', label: 'Spremne', tone: 'text-emerald-700' },
  { key: 'todayCompleted', label: 'Završene danas', tone: 'text-slate-700' },
];

export function OrderStatusCards({ counts }: OrderStatusCardsProps) {
  return (
    <section
      aria-label="Pregled statusa"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      {cards.map((card) => (
        <article
          key={card.key}
          className="border-border bg-surface rounded-xl border p-5"
        >
          <p className="text-muted text-sm font-medium">{card.label}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${card.tone}`}>
            {counts[card.key]}
          </p>
        </article>
      ))}
    </section>
  );
}

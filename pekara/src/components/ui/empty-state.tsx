import type { ReactNode } from 'react';

import { cardVariants } from './card';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cardVariants({ className: 'px-6 py-12 text-center' })}>
      <h2 className="text-xl font-bold">{title}</h2>
      {description ? (
        <p className="text-muted mx-auto mt-2 max-w-xl">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

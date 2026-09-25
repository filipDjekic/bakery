import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Container } from './container';

export function PublicPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('py-10 sm:py-14 lg:py-20', className)}>
      <Container>{children}</Container>
    </div>
  );
}
export function PageStack({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-8 lg:space-y-10', className)} {...props} />
  );
}
export function ContentStack({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-5 sm:space-y-6', className)} {...props} />;
}

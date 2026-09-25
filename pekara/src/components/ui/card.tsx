import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type CardVariant = 'default' | 'muted' | 'interactive';

const variants: Record<CardVariant, string> = {
  default: 'bg-surface shadow-sm',
  muted: 'bg-surface-muted',
  interactive:
    'bg-surface shadow-sm transition-colors hover:border-primary focus-within:border-primary',
};

export function cardVariants({
  variant = 'default',
  className,
}: {
  variant?: CardVariant;
  className?: string;
} = {}): string {
  return cn('border-border rounded-2xl border', variants[variant], className);
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cardVariants({ className })} {...props} />;
}
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 pb-0 sm:p-6 sm:pb-0', className)} {...props} />
  );
}
export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />;
}
export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-border border-t p-5 sm:p-6', className)}
      {...props}
    />
  );
}

import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function PageEyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-primary text-sm font-semibold tracking-wider uppercase',
        className,
      )}
      {...props}
    />
  );
}
export function PageTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl',
        className,
      )}
      {...props}
    />
  );
}
export function PageDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-muted text-base leading-7 sm:text-lg sm:leading-8',
        className,
      )}
      {...props}
    />
  );
}
export function SectionTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-foreground text-2xl font-bold tracking-tight sm:text-3xl',
        className,
      )}
      {...props}
    />
  );
}
export function SectionDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-muted leading-7', className)} {...props} />;
}
export function MutedText({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-muted text-sm', className)} {...props} />;
}
export function BodyText({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-foreground leading-7', className)} {...props} />
  );
}
export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-foreground text-xl font-semibold', className)}
      {...props}
    />
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('max-w-3xl', className)}>
      {eyebrow ? <PageEyebrow>{eyebrow}</PageEyebrow> : null}
      <PageTitle className={eyebrow ? 'mt-2' : undefined}>{title}</PageTitle>
      {description ? (
        <PageDescription className="mt-4">{description}</PageDescription>
      ) : null}
    </header>
  );
}

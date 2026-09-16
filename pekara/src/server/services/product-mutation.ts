import type { ZodIssue } from 'zod';

export type ProductErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_SLUG'
  | 'INACTIVE_CATEGORY'
  | 'IMAGE_REQUIRED';

export class ProductDomainError extends Error {
  readonly code: ProductErrorCode;
  readonly issues?: ZodIssue[];

  constructor(code: ProductErrorCode, message: string, issues?: ZodIssue[]) {
    super(message);
    this.name = 'ProductDomainError';
    this.code = code;
    this.issues = issues;
  }
}

export function isProductSlugConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = error.cause as { code?: unknown } | undefined;
  return (
    cause?.code === '23505' && /product.*slug|slug.*key/i.test(error.message)
  );
}

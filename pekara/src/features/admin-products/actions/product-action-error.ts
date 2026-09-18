import { AppError } from '../../../server/errors/app-error.ts';
import { safeActionFailure } from '../../../server/errors/safe-action-result.ts';
import { ProductImageValidationError } from '../../../server/images/validate-product-image.ts';
import { ProductDomainError } from '../../../server/services/product-mutation.ts';
import type { ProductActionState } from './product-action-state.ts';

export function productActionError(error: unknown): ProductActionState {
  const result = safeActionFailure(error, (cause) => {
    if (cause instanceof ProductImageValidationError)
      return new AppError({
        code: 'VALIDATION_ERROR',
        safeMessage: cause.message,
        cause,
      });
    if (cause instanceof ProductDomainError) {
      const code =
        cause.code === 'NOT_FOUND'
          ? 'NOT_FOUND'
          : cause.code === 'DUPLICATE_SLUG'
            ? 'DUPLICATE_RESOURCE'
            : cause.code === 'VALIDATION_ERROR'
              ? 'VALIDATION_ERROR'
              : 'CONFLICT';
      return new AppError({ code, safeMessage: cause.message, cause });
    }
    return null;
  });
  if (result.ok) throw new Error('Expected safe action failure.');
  return { status: 'error', message: result.error.message };
}

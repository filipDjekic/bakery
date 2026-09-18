import { AppError } from '../../../server/errors/app-error.ts';
import { safeActionFailure } from '../../../server/errors/safe-action-result.ts';
import { CategoryDomainError } from '../../../server/services/categories.ts';
import type { CategoryActionState } from './category-action-state.ts';

export function categoryActionError(error: unknown): CategoryActionState {
  const result = safeActionFailure(error, (cause) =>
    cause instanceof CategoryDomainError
      ? new AppError({
          code:
            cause.code === 'NOT_FOUND'
              ? 'NOT_FOUND'
              : cause.code === 'DUPLICATE_SLUG'
                ? 'DUPLICATE_RESOURCE'
                : cause.code === 'VALIDATION_ERROR'
                  ? 'VALIDATION_ERROR'
                  : 'CONFLICT',
          safeMessage: cause.message,
          cause,
        })
      : null,
  );
  if (result.ok) throw new Error('Expected safe action failure.');
  return { status: 'error', message: result.error.message };
}

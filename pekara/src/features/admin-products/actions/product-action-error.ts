import { ProductImageValidationError } from '../../../server/images/validate-product-image.ts';
import { ProductDomainError } from '../../../server/services/product-mutation.ts';
import type { ProductActionState } from './product-action-state.ts';

export function productActionError(error: unknown): ProductActionState {
  if (
    error instanceof ProductDomainError ||
    error instanceof ProductImageValidationError
  ) {
    return { status: 'error', message: error.message };
  }
  console.error('Unexpected product mutation failure.', error);
  return {
    status: 'error',
    message: 'Izmena nije sačuvana. Pokušajte ponovo.',
  };
}

import type { CategoryMutationInput } from '../../../validation/category.ts';

export function categoryValuesFromFormData(
  formData: FormData,
): CategoryMutationInput {
  return {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    description: String(formData.get('description') ?? ''),
    sortOrder: String(formData.get('sortOrder') ?? ''),
    isActive: formData.get('isActive') === 'on',
  };
}

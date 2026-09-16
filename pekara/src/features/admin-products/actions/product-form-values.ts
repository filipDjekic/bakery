import type { ProductMutationInput } from '../../../validation/product.ts';

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on' || formData.get(name) === 'true';
}

export function productValuesFromFormData(
  formData: FormData,
): ProductMutationInput {
  return {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    description: String(formData.get('description') ?? ''),
    priceMinor: String(formData.get('priceMinor') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    sortOrder: String(formData.get('sortOrder') ?? ''),
    isActive: checked(formData, 'isActive'),
    isAvailable: checked(formData, 'isAvailable'),
  };
}

export function optionalImageFromFormData(formData: FormData): File | null {
  const value = formData.get('image');
  return value instanceof File && value.size > 0 ? value : null;
}

'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '../../../server/auth/authorization.ts';
import { updateCategory } from '../../../server/services/categories.ts';
import { categoryActionError } from './category-action-error.ts';
import type { CategoryActionState } from './category-action-state.ts';
import { categoryValuesFromFormData } from './category-form-values.ts';

export async function updateCategoryAction(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  try {
    await requireAdmin();
    const id = String(formData.get('id') ?? '');
    await updateCategory(
      {
        ...categoryValuesFromFormData(formData),
        id,
        confirmDeactivation: formData.get('confirmDeactivation') === 'on',
      },
      async () => undefined,
    );
    revalidatePath('/');
    revalidatePath('/proizvodi');
    revalidatePath('/admin/categories');
    revalidatePath(`/admin/categories/${id}`);
    revalidatePath('/admin/products');
    return { status: 'success', message: 'Kategorija je sačuvana.' };
  } catch (error) {
    return categoryActionError(error);
  }
}

'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '../../../server/auth/authorization.ts';
import { createCategory } from '../../../server/services/categories.ts';
import { categoryActionError } from './category-action-error.ts';
import type { CategoryActionState } from './category-action-state.ts';
import { categoryValuesFromFormData } from './category-form-values.ts';

export async function createCategoryAction(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  try {
    await requireAdmin();
    const category = await createCategory(
      categoryValuesFromFormData(formData),
      async () => undefined,
    );
    revalidatePath('/');
    revalidatePath('/proizvodi');
    revalidatePath('/admin/categories');
    return { status: 'success', message: `/admin/categories/${category.id}` };
  } catch (error) {
    return categoryActionError(error);
  }
}

'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { setSuccessFlash } from '../../../server/http/flash-toast.ts';

import { requireAdmin } from '../../../server/auth/authorization.ts';
import { PUBLIC_CACHE_TAGS } from '../../../server/cache/tags.ts';
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
    await createCategory(
      categoryValuesFromFormData(formData),
      async () => undefined,
    );
    updateTag(PUBLIC_CACHE_TAGS.catalog);
    updateTag(PUBLIC_CACHE_TAGS.categories);
    revalidatePath('/');
    revalidatePath('/proizvodi');
    revalidatePath('/admin/categories');
    await setSuccessFlash('Kategorija je uspešno kreirana.');
  } catch (error) {
    return categoryActionError(error);
  }
  redirect('/admin/categories');
}

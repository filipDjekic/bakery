'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import type { AdminCategoryDetails } from '../../../server/queries/admin-categories';
import { createCategoryAction } from '../actions/create-category';
import { initialCategoryActionState } from '../actions/category-action-state';
import { updateCategoryAction } from '../actions/update-category';

export function CategoryForm({
  category,
}: {
  category?: AdminCategoryDetails;
}) {
  const router = useRouter();
  const action = category ? updateCategoryAction : createCategoryAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialCategoryActionState,
  );
  useEffect(() => {
    if (state.status === 'success' && state.message?.startsWith('/'))
      router.push(state.message);
  }, [router, state]);
  return (
    <form
      action={formAction}
      className="border-border bg-surface max-w-2xl space-y-6 rounded-xl border p-6"
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Naziv</span>
          <input
            required
            maxLength={80}
            name="name"
            defaultValue={category?.name}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Slug</span>
          <input
            required
            maxLength={100}
            name="slug"
            defaultValue={category?.slug}
            readOnly={Boolean(category)}
            className="border-border w-full rounded-md border px-3 py-2 read-only:bg-zinc-100"
          />
          {category ? (
            <span className="text-muted block text-xs">
              Slug se ne menja posle kreiranja.
            </span>
          ) : null}
        </label>
      </div>
      <label className="block space-y-2">
        <span className="font-semibold">Opis</span>
        <textarea
          maxLength={300}
          rows={4}
          name="description"
          defaultValue={category?.description ?? ''}
          className="border-border w-full rounded-md border px-3 py-2"
        />
      </label>
      <label className="block max-w-48 space-y-2">
        <span className="font-semibold">Redosled</span>
        <input
          required
          step={1}
          type="number"
          name="sortOrder"
          defaultValue={category?.sortOrder ?? 0}
          className="border-border w-full rounded-md border px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={category?.isActive ?? true}
        />{' '}
        Aktivna kategorija
      </label>
      {category?.isActive && category.activeProductCount > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p>
            Deaktivacija će sakriti {category.activeProductCount} aktivnih
            proizvoda iz javnog kataloga.
          </p>
          <label className="mt-3 flex items-start gap-2 font-semibold">
            <input type="checkbox" name="confirmDeactivation" /> Potvrđujem
            deaktivaciju kategorije sa aktivnim proizvodima.
          </label>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' && category ? (
        <p
          role="status"
          className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="bg-primary hover:bg-primary-hover min-h-11 rounded-md px-5 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending
          ? 'Čuvanje…'
          : category
            ? 'Sačuvaj izmene'
            : 'Kreiraj kategoriju'}
      </button>
    </form>
  );
}

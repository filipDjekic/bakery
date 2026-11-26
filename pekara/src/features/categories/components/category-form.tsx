'use client';
import { slugCandidate } from '@/lib/slug';
import { usePreservedFormAction } from '@/lib/use-preserved-form-action';

import { Input, Textarea } from '@/components/ui/input';
import { useEffect, useState } from 'react';
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
  const [name, setName] = useState(category?.name ?? '');
  const action = category ? updateCategoryAction : createCategoryAction;
  const [state, formAction, pending] = usePreservedFormAction(
    action,
    initialCategoryActionState,
    category ? undefined : 'Kategorija je kreirana.',
  );
  useEffect(() => {
    if (state.status === 'success' && state.message?.startsWith('/'))
      router.push(state.message);
  }, [router, state]);
  return (
    <form
      onSubmit={formAction}
      className="border-border bg-surface max-w-2xl space-y-6 rounded-xl border p-6"
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      {category ? (
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={category.updatedAt}
        />
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span id="name-label" className="font-semibold">
            Naziv
          </span>
          <Input
            required
            maxLength={80}
            id="name"
            aria-labelledby="name-label"
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={
              state.fieldErrors?.name ? 'name-error' : undefined
            }
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {state.fieldErrors?.name ? (
            <span id="name-error" className="block text-sm text-red-800">
              {state.fieldErrors.name}
            </span>
          ) : null}
        </label>
        <label className="space-y-2">
          <span id="slug-label" className="font-semibold">
            Slug
          </span>
          <Input
            required
            maxLength={100}
            id="slug"
            aria-labelledby="slug-label"
            aria-invalid={Boolean(state.fieldErrors?.slug)}
            aria-describedby={
              state.fieldErrors?.slug ? 'slug-error' : undefined
            }
            name="slug"
            value={category?.slug ?? slugCandidate(name, 100)}
            className="bg-surface-muted text-muted"
            readOnly
          />
          {state.fieldErrors?.slug ? (
            <span id="slug-error" className="block text-sm text-red-800">
              {state.fieldErrors.slug}
            </span>
          ) : null}
          {category ? (
            <span className="text-muted block text-xs">
              Slug se ne menja posle kreiranja.
            </span>
          ) : null}
        </label>
      </div>
      <label className="block space-y-2">
        <span id="description-label" className="font-semibold">
          Opis
        </span>
        <Textarea
          maxLength={300}
          rows={4}
          id="description"
          aria-labelledby="description-label"
          aria-invalid={Boolean(state.fieldErrors?.description)}
          aria-describedby={
            state.fieldErrors?.description ? 'description-error' : undefined
          }
          name="description"
          defaultValue={category?.description ?? ''}
        />
        {state.fieldErrors?.description ? (
          <span id="description-error" className="block text-sm text-red-800">
            {state.fieldErrors.description}
          </span>
        ) : null}
      </label>
      <label className="block max-w-48 space-y-2">
        <span id="sortOrder-label" className="font-semibold">
          Redosled
        </span>
        <Input
          required
          step={1}
          type="number"
          id="sortOrder"
          aria-labelledby="sortOrder-label"
          aria-invalid={Boolean(state.fieldErrors?.sortOrder)}
          aria-describedby={
            state.fieldErrors?.sortOrder ? 'sortOrder-error' : undefined
          }
          name="sortOrder"
          defaultValue={category?.sortOrder ?? 0}
        />
        {state.fieldErrors?.sortOrder ? (
          <span id="sortOrder-error" className="block text-sm text-red-800">
            {state.fieldErrors.sortOrder}
          </span>
        ) : null}
      </label>
      <label className="flex items-center gap-2">
        <Input
          type="checkbox"
          id="isActive"
          aria-invalid={Boolean(state.fieldErrors?.isActive)}
          aria-describedby={
            state.fieldErrors?.isActive ? 'isActive-error' : undefined
          }
          name="isActive"
          defaultChecked={category?.isActive ?? true}
        />
        {state.fieldErrors?.isActive ? (
          <span id="isActive-error" className="block text-sm text-red-800">
            {state.fieldErrors.isActive}
          </span>
        ) : null}{' '}
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

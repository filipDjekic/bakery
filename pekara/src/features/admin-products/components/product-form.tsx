'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import type {
  AdminCategoryOption,
  AdminProductDetails,
} from '../../../server/queries/admin-products';
import { createProductAction } from '../actions/create-product';
import { initialProductActionState } from '../actions/product-action-state';
import { updateProductAction } from '../actions/update-product';

type ProductFormProps = {
  categories: AdminCategoryOption[];
  product?: AdminProductDetails;
};

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialProductActionState,
  );
  useEffect(() => {
    if (state.status === 'success' && state.message?.startsWith('/'))
      router.push(state.message);
  }, [router, state]);
  const activeCategories = categories.filter(
    (category) => category.isActive || category.id === product?.categoryId,
  );
  return (
    <form
      action={formAction}
      className="border-border bg-surface max-w-3xl space-y-6 rounded-xl border p-6"
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Naziv</span>
          <input
            required
            maxLength={120}
            name="name"
            defaultValue={product?.name}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Slug</span>
          <input
            required
            maxLength={140}
            name="slug"
            defaultValue={product?.slug}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
      </div>
      {product ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="changeSlug" /> Eksplicitno promeni slug
        </label>
      ) : null}
      <label className="block space-y-2">
        <span className="font-semibold">Opis</span>
        <textarea
          required
          maxLength={1000}
          rows={5}
          name="description"
          defaultValue={product?.description}
          className="border-border w-full rounded-md border px-3 py-2"
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="font-semibold">Cena (para)</span>
          <input
            required
            min={0}
            step={1}
            type="number"
            name="priceMinor"
            defaultValue={product?.priceMinor ?? 0}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Kategorija</span>
          <select
            required
            name="categoryId"
            defaultValue={product?.categoryId ?? ''}
            className="border-border w-full rounded-md border px-3 py-2"
          >
            <option value="" disabled>
              Izaberite
            </option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? '' : ' (neaktivna)'}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Redosled</span>
          <input
            required
            step={1}
            type="number"
            name="sortOrder"
            defaultValue={product?.sortOrder ?? 0}
            className="border-border w-full rounded-md border px-3 py-2"
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="font-semibold">
          Slika {product ? '(ostavite prazno da ostane postojeća)' : ''}
        </span>
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="border-border block w-full rounded-md border px-3 py-2"
        />
        <span className="text-muted block text-xs">
          JPEG, PNG ili WebP, najviše 3 MB.
        </span>
      </label>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={product?.isActive ?? true}
          />{' '}
          Aktivan
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isAvailable"
            defaultChecked={product?.isAvailable ?? true}
          />{' '}
          Dostupan
        </label>
      </div>
      {state.status === 'error' ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' && product ? (
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
        {pending ? 'Čuvanje…' : product ? 'Sačuvaj izmene' : 'Kreiraj proizvod'}
      </button>
    </form>
  );
}

'use client';
import { usePreservedFormAction } from '@/lib/use-preserved-form-action';

import Image from 'next/image';
import { Input, Select, Textarea } from '@/components/ui/input';
import { slugCandidate } from '@/lib/slug';
import { SALE_UNITS } from '@/config/sale-units';
import { formatRsdInput } from '@/lib/price-input';
import { useEffect, useState } from 'react';
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
  const [name, setName] = useState(product?.name ?? '');
  const [active, setActive] = useState(product?.isActive ?? true);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = usePreservedFormAction(
    action,
    initialProductActionState,
    product ? undefined : 'Proizvod je kreiran.',
  );
  useEffect(() => {
    if (state.status === 'success' && state.message?.startsWith('/'))
      router.push(state.message);
  }, [router, state]);
  const error = (field: string) =>
    state.fieldErrors?.[field === 'priceRsd' ? 'priceMinor' : field];
  const feedback = (field: string) =>
    error(field) ? (
      <span id={`${field}-error`} className="block text-sm text-red-800">
        {error(field)}
      </span>
    ) : null;
  const activeCategories = categories.filter(
    (category) => category.isActive || category.id === product?.categoryId,
  );
  return (
    <form
      onSubmit={formAction}
      className="border-border bg-surface max-w-4xl space-y-5 rounded-xl border p-4 sm:p-6"
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span id="name-label" className="font-semibold">
            Naziv
          </span>
          <Input
            required
            maxLength={120}
            id="name"
            aria-labelledby="name-label"
            aria-invalid={Boolean(error('name'))}
            aria-describedby={error('name') ? 'name-error' : undefined}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {feedback('name')}
        </label>
        <label className="space-y-2">
          <span id="slug-label" className="font-semibold">
            Slug
          </span>
          <Input
            required
            maxLength={140}
            id="slug"
            aria-labelledby="slug-label"
            aria-invalid={Boolean(error('slug'))}
            aria-describedby={error('slug') ? 'slug-error' : undefined}
            name="slug"
            value={product?.slug ?? slugCandidate(name, 140)}
            readOnly
            className="bg-surface-muted text-muted"
          />
          {feedback('slug')}
        </label>
      </div>
      <label className="block space-y-2">
        <span id="description-label" className="font-semibold">
          Opis
        </span>
        <Textarea
          required
          maxLength={1000}
          rows={5}
          id="description"
          aria-labelledby="description-label"
          aria-invalid={Boolean(error('description'))}
          aria-describedby={
            error('description') ? 'description-error' : undefined
          }
          name="description"
          defaultValue={product?.description}
        />
        {feedback('description')}
      </label>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="space-y-2">
          <span id="priceRsd-label" className="font-semibold">
            Cena (RSD)
          </span>
          <Input
            required
            min={0}
            inputMode="decimal"
            id="priceRsd"
            aria-labelledby="priceRsd-label"
            aria-invalid={Boolean(error('priceRsd'))}
            aria-describedby={error('priceRsd') ? 'priceRsd-error' : undefined}
            name="priceRsd"
            placeholder="150,00"
            defaultValue={formatRsdInput(product?.priceMinor ?? 0)}
          />
          {feedback('priceRsd')}
        </label>
        <label className="space-y-2">
          <span id="categoryId-label" className="font-semibold">
            Kategorija
          </span>
          <Select
            required
            id="categoryId"
            aria-labelledby="categoryId-label"
            aria-invalid={Boolean(error('categoryId'))}
            aria-describedby={
              error('categoryId') ? 'categoryId-error' : undefined
            }
            name="categoryId"
            defaultValue={product?.categoryId ?? ''}
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
          </Select>
          {feedback('categoryId')}
        </label>
        <label className="space-y-2">
          <span id="sortOrder-label" className="font-semibold">
            Redosled
          </span>
          <Input
            required
            step={1}
            type="number"
            id="sortOrder"
            aria-labelledby="sortOrder-label"
            aria-invalid={Boolean(error('sortOrder'))}
            aria-describedby={
              error('sortOrder') ? 'sortOrder-error' : undefined
            }
            name="sortOrder"
            defaultValue={product?.sortOrder ?? 0}
          />
          {feedback('sortOrder')}
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span id="unitLabel-label" className="font-semibold">
            Jedinica prodaje
          </span>
          <Select
            id="unitLabel"
            required
            aria-labelledby="unitLabel-label"
            aria-invalid={Boolean(error('unitLabel'))}
            aria-describedby={
              error('unitLabel') ? 'unitLabel-error' : undefined
            }
            name="unitLabel"
            defaultValue={
              SALE_UNITS.includes(
                product?.unitLabel as (typeof SALE_UNITS)[number],
              )
                ? product!.unitLabel!
                : product?.unitLabel
                  ? ''
                  : 'komad'
            }
          >
            <option value="" disabled>
              Izaberite jedinicu
            </option>
            {SALE_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
          {feedback('unitLabel')}
          {product?.unitLabel &&
          !SALE_UNITS.includes(
            product.unitLabel as (typeof SALE_UNITS)[number],
          ) ? (
            <span className="text-muted block text-xs">
              Postojeća jedinica: {product.unitLabel}. Izaberite odgovarajuću
              jedinicu pre čuvanja.
            </span>
          ) : null}
        </label>
        <label className="space-y-2">
          <span id="allergenInfo-label" className="font-semibold">
            Podaci o alergenima (opciono)
          </span>
          <Textarea
            id="allergenInfo"
            aria-labelledby="allergenInfo-label"
            aria-invalid={Boolean(error('allergenInfo'))}
            aria-describedby={
              error('allergenInfo') ? 'allergenInfo-error' : undefined
            }
            name="allergenInfo"
            maxLength={500}
            defaultValue={product?.allergenInfo ?? ''}
          />
          {feedback('allergenInfo')}
          <span className="text-muted text-xs">
            Unesite samo proverene podatke o proizvodu.
          </span>
        </label>
      </div>
      <label className="block space-y-2">
        <span id="image-label" className="font-semibold">
          Slika (obavezna za aktivan proizvod){' '}
          {product ? '(ostavite prazno da ostane postojeća)' : ''}
        </span>
        <Input
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
          required={!product && active}
          type="file"
          id="image"
          aria-labelledby="image-label"
          aria-invalid={Boolean(error('image'))}
          aria-describedby={error('image') ? 'image-error' : undefined}
          name="image"
          accept="image/jpeg,image/png,image/webp"
        />
        {feedback('image')}
        <span className="text-muted block text-xs">
          JPEG, PNG ili WebP, najviše 3 MB.
        </span>
      </label>
      {preview || product?.imageUrl ? (
        <Image
          unoptimized
          src={preview ?? product?.imageUrl ?? ''}
          width={320}
          height={240}
          alt="Pregled slike proizvoda"
          className="aspect-[4/3] rounded-xl object-cover"
        />
      ) : null}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2">
          <Input
            type="checkbox"
            name="isActive"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />{' '}
          Aktivan
        </label>
        <label className="flex items-center gap-2">
          <Input
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

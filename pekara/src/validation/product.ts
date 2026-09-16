import { z } from 'zod';

import { PRODUCT_LIMITS } from '../config/limits.ts';

const plainText = z
  .string()
  .trim()
  .min(1, 'Opis je obavezan.')
  .max(PRODUCT_LIMITS.description, 'Opis je predugačak.')
  .refine((value) => !/[<>]/.test(value), 'Opis mora biti običan tekst.');

export function normalizeProductSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const productMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Naziv je obavezan.')
    .max(PRODUCT_LIMITS.name, 'Naziv je predugačak.'),
  slug: z
    .string()
    .transform(normalizeProductSlug)
    .pipe(
      z
        .string()
        .min(1, 'Slug je obavezan.')
        .max(PRODUCT_LIMITS.slug, 'Slug je predugačak.')
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug nije validan.'),
    ),
  description: plainText,
  priceMinor: z.coerce
    .number()
    .int('Cena mora biti ceo broj para.')
    .min(0, 'Cena ne može biti negativna.')
    .max(PRODUCT_LIMITS.maximumPriceMinor, 'Cena je previsoka.'),
  categoryId: z.string().uuid('Kategorija nije validna.'),
  sortOrder: z.coerce
    .number()
    .int('Redosled mora biti ceo broj.')
    .min(PRODUCT_LIMITS.minimumSortOrder)
    .max(PRODUCT_LIMITS.maximumSortOrder),
  isActive: z.boolean(),
  isAvailable: z.boolean(),
});

export const productToggleSchema = z.object({
  id: z.string().uuid('Proizvod nije validan.'),
  value: z.boolean(),
});

export type ProductMutationInput = z.input<typeof productMutationSchema>;
export type ProductMutation = z.output<typeof productMutationSchema>;

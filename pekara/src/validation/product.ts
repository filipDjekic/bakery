import { z } from 'zod';

import { normalizeSlug } from '../lib/slug.ts';
import { SALE_UNITS } from '../config/sale-units.ts';

import { PRODUCT_LIMITS } from '../config/limits.ts';

const plainText = z
  .string()
  .trim()
  .min(1, 'Opis je obavezan.')
  .max(PRODUCT_LIMITS.description, 'Opis je predugačak.')
  .refine((value) => !/[<>]/.test(value), 'Opis mora biti običan tekst.');

export { normalizeSlug as normalizeProductSlug } from '../lib/slug.ts';

export const productMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Naziv je obavezan.')
    .max(PRODUCT_LIMITS.name, 'Naziv je predugačak.')
    .refine(
      (name) => normalizeSlug(name).length > 0,
      'Naziv mora sadržati slova ili brojeve za URL.',
    ),
  // Client slug is ignored by services; published slugs never change.
  slug: z
    .unknown()
    .optional()
    .transform(() => undefined),
  description: plainText,
  unitLabel: z
    .enum(SALE_UNITS, { error: 'Izaberite jedinicu prodaje.' })
    .default('komad'),
  allergenInfo: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !/[<>]/.test(v), 'Unesite običan tekst.')
    .optional(),
  priceMinor: z.coerce
    .number({ error: 'Unesite ispravnu cenu u RSD sa najviše dve decimale.' })
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

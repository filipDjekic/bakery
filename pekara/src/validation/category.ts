import { z } from 'zod';

import { CATEGORY_LIMITS } from '../config/limits.ts';
import { normalizeSlug } from '../lib/slug.ts';

const descriptionSchema = z
  .string()
  .trim()
  .max(CATEGORY_LIMITS.description, 'Opis je predugačak.')
  .refine((value) => !/[<>]/.test(value), 'Opis mora biti običan tekst.')
  .transform((value) => value || null);

export const categoryMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Naziv je obavezan.')
    .max(CATEGORY_LIMITS.name, 'Naziv je predugačak.')
    .refine(
      (name) => normalizeSlug(name).length > 0,
      'Naziv mora sadržati slova ili brojeve za URL.',
    ),
  slug: z
    .unknown()
    .optional()
    .transform(() => undefined),
  description: descriptionSchema,
  sortOrder: z.coerce
    .number()
    .int('Redosled mora biti ceo broj.')
    .min(CATEGORY_LIMITS.minimumSortOrder)
    .max(CATEGORY_LIMITS.maximumSortOrder),
  isActive: z.boolean(),
});

export const categoryUpdateSchema = categoryMutationSchema.extend({
  id: z.string().uuid('Kategorija nije validna.'),
  confirmDeactivation: z.boolean(),
});

export type CategoryMutationInput = z.input<typeof categoryMutationSchema>;
export type CategoryMutation = z.output<typeof categoryMutationSchema>;

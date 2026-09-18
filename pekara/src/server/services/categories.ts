import 'server-only';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { ZodIssue } from 'zod';

import { db } from '../../prisma/db.ts';
import {
  categoryMutationSchema,
  categoryUpdateSchema,
  type CategoryMutationInput,
} from '../../validation/category.ts';
import { requireAdmin } from '../auth/authorization.ts';

export type CategoryErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_SLUG'
  | 'DEACTIVATION_CONFIRMATION_REQUIRED';

export class CategoryDomainError extends Error {
  readonly code: CategoryErrorCode;
  readonly issues?: ZodIssue[];

  constructor(code: CategoryErrorCode, message: string, issues?: ZodIssue[]) {
    super(message);
    this.name = 'CategoryDomainError';
    this.code = code;
    this.issues = issues;
  }
}

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  if (value.length > maxLength)
    throw new Error(`Value exceeds varchar(${maxLength}).`);
  return value as Varchar<N>;
}

function isSlugConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = error.cause as { code?: unknown } | undefined;
  return (
    cause?.code === '23505' && /category.*slug|slug.*key/i.test(error.message)
  );
}

export async function createCategory(
  input: CategoryMutationInput,
  authorize: () => Promise<unknown> = requireAdmin,
): Promise<{ id: string; slug: string }> {
  await authorize();
  const parsed = categoryMutationSchema.safeParse(input);
  if (!parsed.success)
    throw new CategoryDomainError(
      'VALIDATION_ERROR',
      'Podaci kategorije nisu validni.',
      parsed.error.issues,
    );
  const duplicate = await db.orm.public.Category.select('id')
    .where({ slug: varchar(parsed.data.slug, 100) })
    .first();
  if (duplicate)
    throw new CategoryDomainError(
      'DUPLICATE_SLUG',
      'Slug već koristi druga kategorija.',
    );
  try {
    return await db.orm.public.Category.select('id', 'slug').create({
      name: varchar(parsed.data.name, 80),
      slug: varchar(parsed.data.slug, 100),
      description: parsed.data.description
        ? varchar(parsed.data.description, 300)
        : null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    });
  } catch (error) {
    if (isSlugConflict(error))
      throw new CategoryDomainError(
        'DUPLICATE_SLUG',
        'Slug već koristi druga kategorija.',
      );
    throw error;
  }
}

export async function updateCategory(
  input: CategoryMutationInput & { id: string; confirmDeactivation: boolean },
  authorize: () => Promise<unknown> = requireAdmin,
): Promise<{ id: string; slug: string }> {
  await authorize();
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success)
    throw new CategoryDomainError(
      'VALIDATION_ERROR',
      'Podaci kategorije nisu validni.',
      parsed.error.issues,
    );
  const current = await db.orm.public.Category.select('id', 'slug', 'isActive')
    .where({ id: parsed.data.id })
    .first();
  if (!current)
    throw new CategoryDomainError('NOT_FOUND', 'Kategorija ne postoji.');
  if (current.isActive && !parsed.data.isActive) {
    const activeProducts = await db.orm.public.Product.where({
      categoryId: current.id,
      isActive: true,
    }).aggregate((aggregate) => ({ count: aggregate.count() }));
    if (activeProducts.count > 0 && !parsed.data.confirmDeactivation) {
      throw new CategoryDomainError(
        'DEACTIVATION_CONFIRMATION_REQUIRED',
        `Kategorija ima ${activeProducts.count} aktivnih proizvoda. Potvrdite deaktivaciju.`,
      );
    }
  }
  await db.orm.public.Category.where({ id: current.id }).update({
    name: varchar(parsed.data.name, 80),
    description: parsed.data.description
      ? varchar(parsed.data.description, 300)
      : null,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });
  return { id: current.id, slug: current.slug };
}

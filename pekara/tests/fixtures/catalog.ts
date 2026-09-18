import assert from 'node:assert/strict';

import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

import { db } from '../../src/prisma/db.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}

export type CatalogFixture = Awaited<ReturnType<typeof createCatalogFixture>>;

export async function createCatalogFixture() {
  const suffix = crypto.randomUUID();
  const category = await db.orm.public.Category.create({
    name: varchar('Integration kategorija', 80),
    slug: varchar(`integration-category-${suffix}`, 100),
    description: null,
    sortOrder: 0,
    isActive: true,
  });

  const available = await db.orm.public.Product.create({
    categoryId: category.id,
    name: varchar('Sveža kifla', 120),
    slug: varchar(`available-${suffix}`, 140),
    description: varchar('Integration proizvod', 1000),
    priceMinor: 12_500,
    isActive: true,
    isAvailable: true,
    sortOrder: 0,
  });
  const unavailable = await db.orm.public.Product.create({
    categoryId: category.id,
    name: varchar('Nedostupan proizvod', 120),
    slug: varchar(`unavailable-${suffix}`, 140),
    description: varchar('Integration proizvod', 1000),
    priceMinor: 8_000,
    isActive: true,
    isAvailable: false,
    sortOrder: 1,
  });
  const inactive = await db.orm.public.Product.create({
    categoryId: category.id,
    name: varchar('Neaktivan proizvod', 120),
    slug: varchar(`inactive-${suffix}`, 140),
    description: varchar('Integration proizvod', 1000),
    priceMinor: 7_000,
    isActive: false,
    isAvailable: true,
    sortOrder: 2,
  });

  return { category, available, unavailable, inactive };
}

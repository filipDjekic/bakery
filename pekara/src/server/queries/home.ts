import 'server-only';

import { DateTime } from 'luxon';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';

import { calculateCurrentBusinessState } from '../../lib/business-state.ts';
import { formatBusinessHours } from '../../lib/format-business-hours.ts';
import { db } from '../../prisma/db.ts';
import { PUBLIC_CACHE_TAGS } from '../cache/tags.ts';
import { generatePickupSlots } from '../services/pickup-slots.ts';

export type HomepageProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMinor: number;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  isAvailable: boolean;
};

export type HomepageCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
};

export type HomepageBusinessHours = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
};

export type HomepageOperationalState = {
  isOpen: boolean;
  todayHoursLabel: string;
  closesAt: string | null;
  closesAtLabel: string | null;
  opensAtNext: string | null;
  opensAtNextLabel: string | null;
  nextPickupAt: string | null;
  nextPickupLabel: string | null;
};

export async function getCachedHomepageContent() {
  'use cache';
  cacheLife('hours');
  cacheTag(
    PUBLIC_CACHE_TAGS.settings,
    PUBLIC_CACHE_TAGS.catalog,
    PUBLIC_CACHE_TAGS.categories,
  );

  const [settings, categoryRows] = await Promise.all([
    db.orm.public.BakerySettings.include('businessHours', (hours) =>
      hours.orderBy((hour) => hour.openMinute.asc()),
    )
      .where({ id: 'default' })
      .first(),
    db.orm.public.Category.include('products', (products) =>
      products
        .select(
          'id',
          'name',
          'slug',
          'description',
          'priceMinor',
          'imageUrl',
          'imageWidth',
          'imageHeight',
          'isAvailable',
          'sortOrder',
        )
        .where({ isActive: true })
        .orderBy((product) => product.sortOrder.asc())
        .orderBy((product) => product.name.asc())
        .orderBy((product) => product.id.asc()),
    )
      .where({ isActive: true })
      .orderBy((category) => category.sortOrder.asc())
      .orderBy((category) => category.id.asc())
      .all(),
  ]);

  if (!settings) {
    throw new Error("BakerySettings with id 'default' does not exist.");
  }

  const productRows = categoryRows
    .flatMap((category) => category.products)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name, 'sr-Latn') ||
        left.id.localeCompare(right.id),
    );
  const featuredProducts: HomepageProduct[] = productRows
    .slice(0, 4)
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceMinor: product.priceMinor,
      imageUrl: product.imageUrl,
      imageWidth: product.imageWidth,
      imageHeight: product.imageHeight,
      isAvailable: product.isAvailable,
    }));
  const categories: HomepageCategory[] = categoryRows
    .slice(0, 6)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl:
        category.products.find((product) => product.imageUrl)?.imageUrl ?? null,
    }));

  return { settings, categories, featuredProducts };
}

export function calculateHomepageOperationalState(
  settings: Awaited<ReturnType<typeof getCachedHomepageContent>>['settings'],
  now: DateTime,
): {
  todayBusinessHours: HomepageBusinessHours[];
  operational: HomepageOperationalState;
} {
  const localNow = now.setZone(settings.timezone);
  const todayBusinessHours = settings.businessHours
    .filter((hours) => hours.weekday === localNow.weekday)
    .map(({ weekday, openMinute, closeMinute }) => ({
      weekday,
      openMinute,
      closeMinute,
    }));
  const businessState = calculateCurrentBusinessState({
    businessHours: settings.businessHours,
    timezone: settings.timezone,
    now,
  });

  let nextPickupLabel: string | null = null;
  let nextPickupAt: string | null = null;
  for (
    let dayOffset = 0;
    dayOffset <= settings.maximumAdvanceDays;
    dayOffset++
  ) {
    const date = localNow.plus({ days: dayOffset });
    const dateIso = date.toISODate();
    if (!dateIso) continue;
    const hours = settings.businessHours.filter(
      (interval) => interval.weekday === date.weekday,
    );
    const firstSlot = generatePickupSlots({
      date: dateIso,
      settings,
      businessHours: hours,
      now,
    })[0];
    if (firstSlot) {
      nextPickupAt = firstSlot.value;
      nextPickupLabel =
        dayOffset === 0
          ? firstSlot.label
          : `${date.setLocale('sr-Latn').toFormat('dd. LLL')} u ${firstSlot.label}`;
      break;
    }
  }

  return {
    todayBusinessHours,
    operational: {
      ...businessState,
      todayHoursLabel: formatBusinessHours(todayBusinessHours),
      nextPickupAt,
      nextPickupLabel,
    },
  };
}

export async function getCurrentHomepageOperationalState(
  settings: Awaited<ReturnType<typeof getCachedHomepageContent>>['settings'],
  now?: DateTime,
) {
  await connection();
  return calculateHomepageOperationalState(settings, now ?? DateTime.utc());
}

import 'server-only';

import { DateTime } from 'luxon';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';

import { formatBusinessHours } from '@/lib/format-business-hours';
import { db } from '@/prisma/db';
import { PUBLIC_CACHE_TAGS } from '@/server/cache/tags';

export async function getPublicChromeContent() {
  'use cache';
  cacheLife('hours');
  cacheTag(PUBLIC_CACHE_TAGS.settings);

  const settings = await db.orm.public.BakerySettings.include(
    'businessHours',
    (hours) => hours.orderBy((hour) => hour.openMinute.asc()),
  )
    .where({ id: 'default' })
    .first();

  if (!settings) return null;
  return {
    bakeryName: settings.bakeryName,
    address: settings.address,
    phone: settings.phone,
    currencyCode: settings.currencyCode,
    timezone: settings.timezone,
    businessHours: settings.businessHours.map(
      ({ weekday, openMinute, closeMinute }) => ({
        weekday,
        openMinute,
        closeMinute,
      }),
    ),
  };
}

export async function getPublicChromeSettings(now?: DateTime) {
  const settings = await getPublicChromeContent();
  if (!settings) return null;
  await connection();

  const localNow = (now ?? DateTime.utc()).setZone(settings.timezone);
  const minute = localNow.hour * 60 + localNow.minute;
  const todayHours = settings.businessHours.filter(
    (hours) => hours.weekday === localNow.weekday,
  );

  return {
    ...settings,
    todayHoursLabel: formatBusinessHours(todayHours),
    isOpen: todayHours.some(
      ({ openMinute, closeMinute }) =>
        minute >= openMinute && minute < closeMinute,
    ),
  };
}

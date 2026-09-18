import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { db } from '@/prisma/db';
import { PUBLIC_CACHE_TAGS } from '@/server/cache/tags';

export async function getPublicChromeSettings() {
  'use cache';
  cacheLife('hours');
  cacheTag(PUBLIC_CACHE_TAGS.settings);

  const settings = await db.orm.public.BakerySettings.select(
    'bakeryName',
    'address',
    'phone',
  )
    .where({ id: 'default' })
    .first();

  return settings
    ? { ...settings, currentYear: new Date().getFullYear() }
    : null;
}

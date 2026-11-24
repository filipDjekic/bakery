import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { getIntegrationDatabaseUrl } from '../../tests/helpers/db.ts';
import { createFirstAdmin } from '../../scripts/create-admin.ts';
import { db } from '../../src/prisma/db.ts';
import { authPrisma } from '../../src/server/auth/prisma.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
import { createCatalogFixture } from '../../tests/fixtures/catalog.ts';
import { seedOrderSettingsFixture } from '../../tests/fixtures/orders.ts';
import { resetIntegrationDatabase } from '../../tests/helpers/reset-db.ts';
import { E2E_ADMIN } from './auth.ts';

try {
  getIntegrationDatabaseUrl();
  if (process.env.E2E_APPEND_FIXTURE !== 'true') {
    await resetIntegrationDatabase();
    await seedOrderSettingsFixture();
    const catalog = await createCatalogFixture({
      categoryId: 'ee000000-0000-4000-8000-000000000001',
      availableId: 'ee000000-0000-4000-8000-000000000002',
      unavailableId: 'ee000000-0000-4000-8000-000000000003',
      inactiveId: 'ee000000-0000-4000-8000-000000000004',
    });
    await db.orm.public.Category.where({ id: catalog.category.id }).updateAll({
      slug: 'e2e-category' as Varchar<100>,
    });
    await db.orm.public.Product.where({ id: catalog.unavailable.id }).updateAll(
      { slug: 'e2e-unavailable' as Varchar<140> },
    );
    await db.orm.public.Product.where({ id: catalog.available.id }).updateAll({
      slug: 'e2e-available' as Varchar<140>,
      imageUrl: '/file.svg',
      unitLabel: 'komad' as Varchar<40>,
      allergenInfo: 'Test podatak: sadrži gluten.' as Varchar<500>,
    });
    await db.orm.public.Product.where({ id: catalog.inactive.id }).updateAll({
      slug: 'e2e-inactive' as Varchar<140>,
    });
    await createFirstAdmin(E2E_ADMIN);
  } else {
    // Retain stable catalog IDs across tests: production cache remains real.
    await db.orm.public.Order.where((order) =>
      order.status.in([
        'NEW',
        'ACCEPTED',
        'IN_PREPARATION',
        'READY',
        'COMPLETED',
        'CANCELLED',
      ]),
    ).deleteAll();
    await db.orm.public.ActionRateLimitBucket.where((bucket) =>
      bucket.count.gte(0),
    ).deleteAll();
    await authPrisma.rateLimit.deleteMany();
  }
  const available = await db.orm.public.Product.where({
    slug: 'e2e-available' as Varchar<140>,
  }).first();
  const unavailable = await db.orm.public.Product.where({
    isAvailable: false,
    isActive: true,
  }).first();
  const inactive = await db.orm.public.Product.where({
    slug: 'e2e-inactive' as Varchar<140>,
  }).first();
  if (!available || !unavailable || !inactive)
    throw new Error('Run e2e:seed before starting the browser server.');
  const catalog = { available, unavailable, inactive };
  const order = await persistOrder({
    orderNumber: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    idempotencyKey: crypto.randomUUID(),
    payloadHash: 'e2e-admin-order',
    customerName: 'E2E kupac',
    customerPhone: '+381641234567',
    pickupAt: new Date(Date.now() + 3600000).toISOString(),
    currencyCode: 'RSD',
    totalMinor: catalog.available.priceMinor,
    items: [
      {
        productId: catalog.available.id,
        productName: catalog.available.name,
        unitPriceMinor: catalog.available.priceMinor,
        quantity: 1,
        subtotalMinor: catalog.available.priceMinor,
      },
    ],
  });
  console.info(
    `E2E_SEED=${JSON.stringify({
      availableProductName: catalog.available.name,
      productId: catalog.available.id,
      productSlug: catalog.available.slug,
      productPriceMinor: catalog.available.priceMinor,
      categoryId: catalog.available.categoryId,
      inactiveProductId: catalog.inactive.id,
      unavailableProductName: catalog.unavailable.name,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
    })}`,
  );
} finally {
  await Promise.allSettled([db.runtime().close(), authPrisma.$disconnect()]);
}

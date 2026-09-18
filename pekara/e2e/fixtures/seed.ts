import { createFirstAdmin } from '../../scripts/create-admin.ts';
import { db } from '../../src/prisma/db.ts';
import { authPrisma } from '../../src/server/auth/prisma.ts';
import { persistOrder } from '../../src/server/repositories/orders.ts';
import { createCatalogFixture } from '../../tests/fixtures/catalog.ts';
import { INTEGRATION_PICKUP_AT, seedOrderSettingsFixture } from '../../tests/fixtures/orders.ts';
import { resetIntegrationDatabase } from '../../tests/helpers/reset-db.ts';
import { E2E_ADMIN } from './auth.ts';

try {
  await resetIntegrationDatabase();
  await seedOrderSettingsFixture();
  const catalog = await createCatalogFixture();
  await createFirstAdmin(E2E_ADMIN);
  const order = await persistOrder({
    orderNumber: `E2E-${crypto.randomUUID().slice(0, 8)}`,
    idempotencyKey: crypto.randomUUID(),
    payloadHash: 'e2e-admin-order',
    customerName: 'E2E kupac',
    customerPhone: '+381641234567',
    pickupAt: INTEGRATION_PICKUP_AT,
    currencyCode: 'RSD',
    totalMinor: catalog.available.priceMinor,
    items: [{
      productId: catalog.available.id,
      productName: catalog.available.name,
      unitPriceMinor: catalog.available.priceMinor,
      quantity: 1,
      subtotalMinor: catalog.available.priceMinor,
    }],
  });
  console.info(`E2E_SEED=${JSON.stringify({
    availableProductName: catalog.available.name,
    unavailableProductName: catalog.unavailable.name,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
  })}`);
} finally {
  await Promise.allSettled([db.runtime().close(), authPrisma.$disconnect()]);
}

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { db } from '../../src/prisma/db.ts';
import { getCachedHomepageContent } from '../../src/server/queries/home.ts';
import { getAdminSettings } from '../../src/server/queries/admin-settings.ts';
import { getPickupBakerySettings } from '../../src/server/repositories/bakery-settings.ts';
import { getBusinessHoursForWeekday } from '../../src/server/repositories/business-hours.ts';
import {
  SettingsDomainError,
  updateBakeryProfile,
  updateNotificationSettings,
  updateOrderSettings,
} from '../../src/server/services/settings.ts';
import { updateWorkingHours } from '../../src/server/services/update-working-hours.ts';

function varchar<N extends number>(value: string, maxLength: N): Varchar<N> {
  assert.ok(value.length <= maxLength);
  return value as Varchar<N>;
}
const authorize = async () => ({ role: 'ADMIN' });
let original: Awaited<ReturnType<typeof getAdminSettings>>;

before(async () => {
  original = await getAdminSettings(authorize);
});
after(async () => {
  await db.orm.public.BakerySettings.where({ id: 'default' }).update({
    bakeryName: varchar(original.bakeryName, 120),
    phone: varchar(original.phone, 30),
    address: varchar(original.address, 250),
    notificationEmail: original.notificationEmail
      ? varchar(original.notificationEmail, 254)
      : null,
    orderAcceptingEnabled: original.orderAcceptingEnabled,
    minimumPreparationMinutes: original.minimumPreparationMinutes,
    maximumAdvanceDays: original.maximumAdvanceDays,
    pickupSlotMinutes: original.pickupSlotMinutes,
  });
  await db.transaction(async (tx) => {
    await tx.orm.public.BusinessHours.where({
      bakerySettingsId: 'default',
    }).deleteAll();
    if (original.businessHours.length)
      await tx.orm.public.BusinessHours.createAll(
        original.businessHours.map(({ weekday, openMinute, closeMinute }) => ({
          bakerySettingsId: 'default',
          weekday,
          openMinute,
          closeMinute,
        })),
      );
  });
  await db.runtime().close();
});

test('updates profile and public homepage reads database values', async () => {
  const current = await getAdminSettings(authorize);
  await updateBakeryProfile(
    {
      bakeryName: 'Test pekara 9.1',
      phone: '+381111111',
      address: 'Test adresa 91',
      expectedUpdatedAt: current.updatedAt,
    },
    authorize,
  );
  const home = await getCachedHomepageContent();
  assert.equal(home.settings.bakeryName, 'Test pekara 9.1');
  assert.equal(home.settings.address, 'Test adresa 91');
  await assert.rejects(
    () =>
      updateBakeryProfile(
        {
          bakeryName: 'Stale',
          phone: '+381111111',
          address: 'Stale',
          expectedUpdatedAt: current.updatedAt,
        },
        authorize,
      ),
    (error: unknown) =>
      error instanceof SettingsDomainError && error.code === 'CONFLICT',
  );
});

test('updates the notification recipient independently', async () => {
  const current = await getAdminSettings(authorize);
  await updateNotificationSettings(
    {
      notificationEmail: 'test91@example.com',
      expectedUpdatedAt: current.updatedAt,
    },
    authorize,
  );
  const stored = await getAdminSettings(authorize);
  assert.equal(stored.notificationEmail, 'test91@example.com');
});

test('emergency disable and pickup parameters are stored authoritatively', async () => {
  const current = await getAdminSettings(authorize);
  await updateOrderSettings(
    {
      orderAcceptingEnabled: false,
      minimumPreparationMinutes: 120,
      maximumAdvanceDays: 2,
      pickupSlotMinutes: 30,
      expectedUpdatedAt: current.updatedAt,
    },
    authorize,
  );
  const stored = await getPickupBakerySettings();
  assert.deepEqual(
    {
      enabled: stored.orderAcceptingEnabled,
      preparation: stored.minimumPreparationMinutes,
      days: stored.maximumAdvanceDays,
      slot: stored.pickupSlotMinutes,
    },
    { enabled: false, preparation: 120, days: 2, slot: 30 },
  );
});

test('transactionally replaces hours for closed days and split shifts', async () => {
  await updateWorkingHours(
    [
      { weekday: 1, openMinute: 360, closeMinute: 720 },
      { weekday: 1, openMinute: 780, closeMinute: 1020 },
      { weekday: 2, openMinute: 420, closeMinute: 900 },
    ],
    authorize,
  );
  assert.deepEqual(await getBusinessHoursForWeekday('default', 1), [
    { weekday: 1, openMinute: 360, closeMinute: 720 },
    { weekday: 1, openMinute: 780, closeMinute: 1020 },
  ]);
  assert.deepEqual(await getBusinessHoursForWeekday('default', 7), []);
  const before = await getBusinessHoursForWeekday('default', 1);
  await assert.rejects(
    () =>
      updateWorkingHours(
        [
          { weekday: 1, openMinute: 360, closeMinute: 800 },
          { weekday: 1, openMinute: 700, closeMinute: 900 },
        ],
        authorize,
      ),
    (error: unknown) =>
      error instanceof SettingsDomainError && error.code === 'VALIDATION_ERROR',
  );
  assert.deepEqual(await getBusinessHoursForWeekday('default', 1), before);
});

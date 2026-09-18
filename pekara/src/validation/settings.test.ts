import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  bakeryProfileSchema,
  orderSettingsSchema,
  workingHoursSchema,
} from './settings.ts';

const timestamp = new Date().toISOString();
test('validates profile and operational limits', () => {
  assert.equal(
    bakeryProfileSchema.safeParse({
      bakeryName: ' Pekara ',
      phone: ' 011 ',
      address: ' Adresa ',
      notificationEmail: '',
      expectedUpdatedAt: timestamp,
    }).success,
    true,
  );
  assert.equal(
    orderSettingsSchema.safeParse({
      orderAcceptingEnabled: true,
      minimumPreparationMinutes: 241,
      maximumAdvanceDays: 7,
      pickupSlotMinutes: 15,
      expectedUpdatedAt: timestamp,
    }).success,
    false,
  );
  assert.equal(
    orderSettingsSchema.safeParse({
      orderAcceptingEnabled: true,
      minimumPreparationMinutes: 30,
      maximumAdvanceDays: 31,
      pickupSlotMinutes: 25,
      expectedUpdatedAt: timestamp,
    }).success,
    false,
  );
});

test('allows split shifts and rejects invalid or overlapping intervals', () => {
  assert.equal(
    workingHoursSchema.safeParse([
      { weekday: 1, openMinute: 360, closeMinute: 720 },
      { weekday: 1, openMinute: 780, closeMinute: 1020 },
    ]).success,
    true,
  );
  assert.equal(
    workingHoursSchema.safeParse([
      { weekday: 1, openMinute: 360, closeMinute: 800 },
      { weekday: 1, openMinute: 780, closeMinute: 1020 },
    ]).success,
    false,
  );
  assert.equal(
    workingHoursSchema.safeParse([
      { weekday: 1, openMinute: 500, closeMinute: 500 },
    ]).success,
    false,
  );
  assert.equal(
    workingHoursSchema.safeParse([
      { weekday: 1, openMinute: 0, closeMinute: 720 },
      { weekday: 1, openMinute: 720, closeMinute: 1440 },
    ]).success,
    true,
  );
  assert.equal(
    workingHoursSchema.safeParse(
      Array.from({ length: 36 }, (_, index) => ({
        weekday: (index % 7) + 1,
        openMinute: index,
        closeMinute: index + 1,
      })),
    ).success,
    false,
  );
});

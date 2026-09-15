import 'server-only';

import { DateTime } from 'luxon';

import {
  localDateAtMinute,
  parseLocalDate,
  toUtcIso,
} from '../../lib/datetime.ts';
import {
  getPickupBakerySettings,
  type PickupBakerySettings,
} from '../repositories/bakery-settings.ts';
import {
  getBusinessHoursForWeekday,
  type PickupBusinessHours,
} from '../repositories/business-hours.ts';

export type PickupSlot = {
  value: string;
  label: string;
};

type GeneratePickupSlotsInput = {
  date: string;
  settings: PickupBakerySettings;
  businessHours: PickupBusinessHours[];
  now?: DateTime;
};

function assertValidSettings(settings: PickupBakerySettings): void {
  if (
    !Number.isInteger(settings.minimumPreparationMinutes) ||
    settings.minimumPreparationMinutes < 0 ||
    !Number.isInteger(settings.maximumAdvanceDays) ||
    settings.maximumAdvanceDays < 0 ||
    !Number.isInteger(settings.pickupSlotMinutes) ||
    settings.pickupSlotMinutes <= 0
  ) {
    throw new Error('Bakery pickup settings are invalid.');
  }
}

function assertValidBusinessHours(hours: PickupBusinessHours): void {
  if (
    !Number.isInteger(hours.weekday) ||
    hours.weekday < 1 ||
    hours.weekday > 7 ||
    !Number.isInteger(hours.openMinute) ||
    !Number.isInteger(hours.closeMinute) ||
    hours.openMinute < 0 ||
    hours.openMinute >= hours.closeMinute ||
    hours.closeMinute > 1440
  ) {
    throw new Error('Business hours interval is invalid.');
  }
}

export function generatePickupSlots({
  date,
  settings,
  businessHours,
  now = DateTime.utc(),
}: GeneratePickupSlotsInput): PickupSlot[] {
  assertValidSettings(settings);

  if (!now.isValid) {
    throw new Error('Server current time is invalid.');
  }

  const localDate = parseLocalDate(date, settings.timezone);
  const localToday = now.setZone(settings.timezone).startOf('day');
  const lastAllowedDate = localToday.plus({
    days: settings.maximumAdvanceDays,
  });

  if (
    !settings.orderAcceptingEnabled ||
    localDate < localToday ||
    localDate > lastAllowedDate
  ) {
    return [];
  }

  const earliestPickup = now.plus({
    minutes: settings.minimumPreparationMinutes,
  });
  const uniqueSlots = new Map<string, PickupSlot>();

  for (const hours of businessHours) {
    assertValidBusinessHours(hours);

    if (hours.weekday !== localDate.weekday) {
      continue;
    }

    const intervalStart = localDateAtMinute(localDate, hours.openMinute);
    const intervalEnd = localDateAtMinute(localDate, hours.closeMinute);

    for (
      let slot = intervalStart;
      slot < intervalEnd;
      slot = slot.plus({ minutes: settings.pickupSlotMinutes })
    ) {
      if (slot <= now || slot < earliestPickup) {
        continue;
      }

      const value = toUtcIso(slot);
      uniqueSlots.set(value, {
        value,
        label: slot.setLocale('sr-Latn').toFormat('HH:mm'),
      });
    }
  }

  return [...uniqueSlots.values()].sort((left, right) =>
    left.value.localeCompare(right.value),
  );
}

export async function getPickupSlotsForDate(
  date: string,
  now: DateTime = DateTime.utc(),
): Promise<{ slots: PickupSlot[]; bakeryTimezone: string }> {
  const settings = await getPickupBakerySettings();
  const localDate = parseLocalDate(date, settings.timezone);
  const businessHours = await getBusinessHoursForWeekday(
    settings.id,
    localDate.weekday,
  );

  return {
    slots: generatePickupSlots({ date, settings, businessHours, now }),
    bakeryTimezone: settings.timezone,
  };
}

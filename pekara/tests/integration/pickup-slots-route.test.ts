import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DateTime } from 'luxon';

import { createPickupSlotsGetHandler } from '../../src/server/http/pickup-slots.ts';
import type { PickupBakerySettings } from '../../src/server/repositories/bakery-settings.ts';
import { generatePickupSlots } from '../../src/server/services/pickup-slots.ts';

test('returns authoritative slots and bakery timezone for one valid date', async () => {
  let receivedDate: string | undefined;
  const handler = createPickupSlotsGetHandler(async (date) => {
    receivedDate = date;
    return {
      slots: [
        {
          value: '2026-09-18T08:30:00.000Z',
          label: '10:30',
        },
      ],
      bakeryTimezone: 'Europe/Belgrade',
    };
  });

  const response = await handler(
    new Request('http://localhost/api/pickup-slots?date=2026-09-18'),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(receivedDate, '2026-09-18');
  assert.deepEqual(await response.json(), {
    slots: [
      {
        value: '2026-09-18T08:30:00.000Z',
        label: '10:30',
      },
    ],
    bakeryTimezone: 'Europe/Belgrade',
  });
});

test('returns 400 without calling the service for invalid date input', async () => {
  let calls = 0;
  const handler = createPickupSlotsGetHandler(async () => {
    calls += 1;
    return { slots: [], bakeryTimezone: 'Europe/Belgrade' };
  });

  for (const url of [
    'http://localhost/api/pickup-slots',
    'http://localhost/api/pickup-slots?date=18-09-2026',
    'http://localhost/api/pickup-slots?date=2026-02-30',
    'http://localhost/api/pickup-slots?date=2026-09-18&date=2026-09-19',
  ]) {
    const response = await handler(new Request(url));

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, 'INVALID_DATE');
    assert.equal(body.error.message, 'Izaberite ispravan datum.');
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(response.headers.get('x-request-id'), body.requestId);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }

  assert.equal(calls, 0);
});

test('returns an empty slot list for a date outside the configured range', async () => {
  const settings: PickupBakerySettings = {
    id: 'default',
    bakeryName: 'Test pekara',
    phone: '+38111111111',
    address: 'Test adresa',
    notificationEmail: null,
    timezone: 'Europe/Belgrade',
    currencyCode: 'RSD',
    orderAcceptingEnabled: true,
    minimumPreparationMinutes: 30,
    maximumAdvanceDays: 7,
    pickupSlotMinutes: 15,
  };
  const now = DateTime.fromISO('2026-09-15T08:00:00Z');
  const handler = createPickupSlotsGetHandler(async (date) => ({
    slots: generatePickupSlots({
      date,
      settings,
      businessHours: [{ weekday: 3, openMinute: 360, closeMinute: 1200 }],
      now,
    }),
    bakeryTimezone: settings.timezone,
  }));

  const response = await handler(
    new Request('http://localhost/api/pickup-slots?date=2026-09-23'),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    slots: [],
    bakeryTimezone: 'Europe/Belgrade',
  });
});

test('unexpected pickup errors use a safe envelope and correlation header', async () => {
  const handler = createPickupSlotsGetHandler(async () => {
    throw new Error('secret database url');
  });
  const response = await handler(
    new Request('http://localhost/api/pickup-slots?date=2026-09-18'),
  );
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(response.headers.get('x-request-id'), body.requestId);
  assert.ok(!JSON.stringify(body).includes('secret'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

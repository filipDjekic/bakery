import { test, expect } from './fixtures/db.ts';
import { E2E_ADMIN } from './fixtures/auth.ts';
import type { Page } from '@playwright/test';
import { formatDateTime } from '../src/lib/datetime.ts';
async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
test('generated read-only slugs, exact price, create redirects and five-second toasts survive navigation', async ({
  page,
}) => {
  await login(page);
  const name = `Čokoladna kategorija ${crypto.randomUUID().slice(0, 6)}`;
  await page.goto('/admin/categories/new');
  await page.getByLabel('Naziv', { exact: true }).fill(name);
  await expect(page.getByLabel('Slug', { exact: true })).toHaveAttribute(
    'readonly',
    '',
  );
  await expect(page.getByLabel('Slug', { exact: true })).toHaveValue(
    /^cokoladna-kategorija-/,
  );
  await page.clock.install();
  await page.getByRole('button', { name: 'Kreiraj kategoriju' }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  const notice = page.getByText('Kategorija je uspešno kreirana.', {
    exact: true,
  });
  await expect(notice).toBeVisible();
  await page.clock.fastForward(5200);
  await expect(notice).toBeHidden();
  await page.clock.resume();
  await page.goto('/admin/products/new');
  await page.getByLabel('Naziv', { exact: true }).fill(`Burek ${name}`);
  await expect(page.getByLabel('Slug', { exact: true })).toHaveAttribute(
    'readonly',
    '',
  );
  await page.getByLabel('Opis', { exact: true }).fill('Sveže pecivo za test.');
  await page.getByLabel('Cena (RSD)', { exact: true }).fill('180,50');
  await page
    .getByLabel('Kategorija', { exact: true })
    .selectOption({ label: name });
  await expect(
    page.getByLabel('Jedinica prodaje', { exact: true }),
  ).toHaveValue('komad');
  await page.getByLabel('Aktivan', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Kreiraj proizvod' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(
    page.getByText('Proizvod je uspešno kreiran.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('searchbox').fill(`Burek ${name}`);
  await expect(page).toHaveURL(/q=/);
  await expect(
    page.getByRole('row').filter({ hasText: `Burek ${name}` }),
  ).toContainText('180,50 RSD');
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue(`Burek ${name}`);
});
test('mobile order search retains status and URL state on browser navigation', async ({
  page,
  seed,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  await page.goto('/admin/orders?view=all&page=99');
  await page
    .getByRole('searchbox')
    .fill(seed.orderNumber.toLowerCase().slice(0, -2));
  await expect(page).toHaveURL(/q=/);
  await expect(page).not.toHaveURL(/page=99/);
  await page.getByLabel('Status', { exact: true }).selectOption('NEW');
  await expect(page).toHaveURL(/status=NEW/);
  await expect(
    page.getByText(seed.orderNumber, { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('NEW');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
for (const timezoneId of [
  'Europe/Belgrade',
  'UTC',
  'America/New_York',
  'Asia/Tokyo',
]) {
  test.describe(`business time in browser ${timezoneId}`, () => {
    test.use({ timezoneId });
    test('pickup keeps the selected instant and working hours roundtrip unchanged', async ({
      page,
      request,
      seed,
    }) => {
      const { DateTime } = await import('luxon');
      const date = DateTime.utc()
        .setZone('Europe/Belgrade')
        .plus({ days: 1 })
        .toISODate();
      const slots = await (
        await request.get(`/api/pickup-slots?date=${date}`)
      ).json();
      const response = await request.post('/api/orders', {
        data: {
          idempotencyKey: crypto.randomUUID(),
          customerName: 'Vremenski test',
          customerPhone: '+381641234567',
          pickupAt: slots.slots[0].value,
          items: [
            {
              productId: seed.productId,
              quantity: 1,
              displayPriceMinor: seed.productPriceMinor,
            },
          ],
        },
      });
      expect(response.status()).toBe(201);
      const confirmation = await response.json();
      expect(confirmation.pickupAt).toBe(slots.slots[0].value);
      await page.goto(`/porudzbina/${confirmation.orderId}`);
      await expect(
        page.getByText(formatDateTime(confirmation.pickupAt), { exact: true }),
      ).toBeVisible();
      await login(page);
      await page.goto('/admin/settings');
      const opening = page.getByLabel('Ponedeljak od 1');
      await opening.fill('06:00');
      await page.getByRole('button', { name: 'Sačuvaj radno vreme' }).click();
      await expect(page.locator('#hours').getByRole('status')).toContainText(
        'sačuvano',
      );
      await page.reload();
      await expect(opening).toHaveValue('06:00');
      await expect(page.getByLabel('Ponedeljak do 1')).toHaveValue('24:00');
      await opening.fill('00:00');
      await page.getByRole('button', { name: 'Sačuvaj radno vreme' }).click();
      await expect(page.locator('#hours').getByRole('status')).toContainText(
        'sačuvano',
      );
    });
  });
}

import { DateTime } from 'luxon';

import { expect, test } from './fixtures/db.ts';

test('customer completes catalog, cart, checkout and confirmation flow', async ({
  page,
  seed,
}) => {
  await page.goto('/proizvodi');
  await page
    .getByRole('button', { name: `Dodaj ${seed.availableProductName} u korpu` })
    .click();
  await expect(page.getByRole('status')).toContainText('dodat u korpu');
  await page.goto('/korpa');
  await page.getByRole('link', { name: /nastavi|poru/i }).click();
  await page.getByLabel('Ime i prezime').fill('E2E Kupac');
  await page.getByLabel('Telefon').fill('064 123 4567');
  const date = DateTime.now()
    .setZone('Europe/Belgrade')
    .plus({ days: 1 })
    .toISODate();
  await page.getByLabel(/datum/i).fill(date!);
  const time = page.getByLabel(/termin|vreme/i);
  await expect(time.locator('option')).not.toHaveCount(1);
  await time.selectOption({ index: 1 });
  await page.getByRole('button', { name: /poru/i }).click();
  await expect(page.getByRole('heading', { name: /hvala/i })).toBeVisible();
  await expect(page).toHaveURL(/\/porudzbina\/[0-9a-f-]+$/);
});

test('unavailable product cannot be added', async ({ page, seed }) => {
  await page.goto('/proizvodi');
  await expect(
    page.getByRole('button', {
      name: `${seed.unavailableProductName} je rasprodat`,
    }),
  ).toBeDisabled();
});

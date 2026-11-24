import { expect, test } from './fixtures/db.ts';

test('customer completes catalog, cart, checkout and confirmation flow', async ({
  page,
  seed,
}) => {
  await page.goto('/proizvodi');
  await page
    .getByRole('button', { name: `Dodaj ${seed.availableProductName} u korpu` })
    .click();
  await expect(
    page.getByRole('status', {
      name: `Količina proizvoda ${seed.availableProductName}`,
    }),
  ).toHaveText('1');
  await page.goto('/korpa');
  await page.getByRole('link', { name: /nastavi|poru/i }).click();
  await page.getByLabel('Ime i prezime').fill('E2E Kupac');
  await page.getByLabel('Telefon').fill('064 123 4567');
  await page.getByRole('button', { name: /Sutra/ }).click();
  const slots = page
    .getByRole('group', { name: 'Termin preuzimanja' })
    .getByRole('button', { name: /^\d{2}:\d{2}$/ });
  await expect(slots.first()).toBeVisible();
  await slots.first().click();
  await page.getByRole('button', { name: /poru/i }).click();
  await expect(page.getByRole('heading', { name: /hvala/i })).toBeVisible();
  await expect(page).toHaveURL(/\/porudzbina\/[0-9a-f-]+$/);
});

test('unavailable product cannot be added', async ({ page, seed }) => {
  await page.goto('/proizvodi');
  const card = page.getByRole('article').filter({
    has: page.getByRole('heading', {
      name: seed.unavailableProductName,
      exact: true,
    }),
  });
  await expect(card.getByText('Rasprodato').first()).toBeVisible();
  await expect(card.getByRole('button')).toHaveCount(0);
});

test('blocked session storage and a lost committed response retry one order with the same key', async ({
  page,
  seed,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    }),
  );
  const keys: string[] = [];
  let committedId = '';
  await page.route('**/api/orders', async (route) => {
    keys.push(route.request().postDataJSON().idempotencyKey);
    const response = await route.fetch();
    if (keys.length === 1) {
      expect(response.status()).toBe(201);
      committedId = (await response.json()).orderId;
      await route.abort('failed');
    } else {
      expect(response.status()).toBe(200);
      await route.fulfill({ response });
    }
  });
  await page.goto('/proizvodi');
  await page
    .getByRole('button', { name: `Dodaj ${seed.availableProductName} u korpu` })
    .click();
  await page.goto('/checkout');
  await page.getByLabel('Ime i prezime').fill('E2E Retry');
  await page.getByLabel('Telefon').fill('064 123 4567');
  await page.getByRole('button', { name: /Sutra/ }).click();
  const slot = page
    .getByRole('group', { name: 'Termin preuzimanja' })
    .getByRole('button', { name: /^\d{2}:\d{2}$/ })
    .first();
  await expect(slot).toBeVisible();
  await slot.click();
  await page.getByRole('button', { name: /pošalji porudžbinu/i }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    /Mrežna greška/,
  );
  await page.getByRole('button', { name: /pošalji porudžbinu/i }).click();
  await expect(page).toHaveURL(new RegExp(`/porudzbina/${committedId}$`));
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

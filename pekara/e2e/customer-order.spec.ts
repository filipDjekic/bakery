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

test('expired checkout selection reloads slots, keeps contact and requires a new selection', async ({
  page,
  seed,
}) => {
  let requests = 0;
  await page.route('**/api/orders', async (route) => {
    requests++;
    if (requests === 1)
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          requestId: 'e2e-expired',
          error: {
            code: 'INVALID_PICKUP_SLOT',
            message: 'Izabrani termin više nije dostupan.',
          },
        }),
      });
    else await route.continue();
  });
  await page.goto('/proizvodi');
  await page
    .getByRole('button', { name: `Dodaj ${seed.availableProductName} u korpu` })
    .click();
  await page.goto('/checkout');
  await page.getByLabel('Ime i prezime').fill('Oporavak kupca');
  await page.getByLabel('Telefon').fill('064 123 4567');
  await page.getByRole('button', { name: /Sutra/ }).click();
  const slot = page
    .getByRole('group', { name: 'Termin preuzimanja' })
    .getByRole('button', { name: /^\d{2}:\d{2}$/ })
    .first();
  await slot.click();
  const submit = page.getByRole('button', { name: /pošalji porudžbinu/i });
  await submit.click();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Izabrani termin više nije dostupan',
  );
  await expect(submit).toBeDisabled();
  await expect(page.getByLabel('Ime i prezime')).toHaveValue('Oporavak kupca');
  await expect(slot).toHaveAttribute('aria-pressed', 'false');
  await slot.click();
  await submit.click();
  await expect(page).toHaveURL(/\/porudzbina\/[0-9a-f-]+$/);
  expect(requests).toBe(2);
});

test('missing category URLs show the Serbian missing page instead of the complete catalog', async ({
  page,
}) => {
  await page.goto(
    '/proizvodi?category=missing-category-slug&q=hleb&sort=price-asc',
  );
  await expect(
    page.getByRole('heading', { name: /nije pronađena/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Dodaj .* u korpu/ }),
  ).toHaveCount(0);
});

test('cart quantities synchronize across tabs in the same browser session', async ({
  page,
  context,
  seed,
}) => {
  await page.goto('/proizvodi');
  await page
    .getByRole('button', { name: `Dodaj ${seed.availableProductName} u korpu` })
    .click();
  const second = await context.newPage();
  await second.goto('/korpa');
  await expect(
    second.getByRole('combobox', {
      name: `Količina proizvoda ${seed.availableProductName}`,
    }),
  ).toHaveValue('1');
  await page
    .getByRole('button', {
      name: `Povećaj količinu proizvoda ${seed.availableProductName}`,
    })
    .click();
  await expect(
    second.getByRole('combobox', {
      name: `Količina proizvoda ${seed.availableProductName}`,
    }),
  ).toHaveValue('2');
  await second.close();
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
  await page
    .getByRole('button', { name: 'Proveri poslatu porudžbinu' })
    .click();
  await expect(page).toHaveURL(new RegExp(`/porudzbina/${committedId}$`));
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

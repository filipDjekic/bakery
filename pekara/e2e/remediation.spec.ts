import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { E2E_ADMIN } from './fixtures/auth.ts';
import { test, expect } from './fixtures/db.ts';
async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    ),
  ).toEqual([]);
}
test('admin saves exact RSD and verified metadata; failed validation retains input and image preview', async ({
  page,
  seed,
}) => {
  await login(page);
  await page.goto(`/admin/products/${seed.productId}`);
  const price = page.getByLabel('Cena (RSD)', { exact: true });
  await expect(price).toHaveValue('125,00');
  await price.fill('180,50');
  await page.getByLabel('Jedinica prodaje (opciono)').fill('100 g');
  await page
    .getByLabel('Podaci o alergenima (opciono)')
    .fill('Test podatak: gluten.');
  await page.getByRole('button', { name: 'Sačuvaj izmene' }).click();
  await expect(page.getByRole('status')).toContainText(/sačuvan/i);
  await page.reload();
  await expect(price).toHaveValue('180,50');
  await accessible(page);
  await page.goto(`/proizvodi/${seed.productSlug}`);
  await expect(page.getByText('Jedinica prodaje: 100 g')).toBeVisible();
  await expect(page.getByText('Alergeni: Test podatak: gluten.')).toBeVisible();
  await page.goto(`/admin/products/${seed.productId}`);
  await price.fill('180,501');
  await page.getByLabel('Naziv', { exact: true }).fill('Unos posle greške');
  await page.getByRole('button', { name: 'Sačuvaj izmene' }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await expect(price).toHaveValue('180,501');
  await expect(page.getByLabel('Naziv', { exact: true })).toHaveValue(
    'Unos posle greške',
  );
  await expect(price).toHaveAttribute('aria-invalid', 'true');
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6QmcAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByAltText('Pregled slike proizvoda')).toHaveAttribute(
    'src',
    /^blob:/,
  );
  // Restore through the real action, preserving real cache invalidation.
  await page.reload();
  await price.fill('125,00');
  await page.getByLabel('Jedinica prodaje (opciono)').fill('komad');
  await page
    .getByLabel('Podaci o alergenima (opciono)')
    .fill('Test podatak: sadrži gluten.');
  await page.getByRole('button', { name: 'Sačuvaj izmene' }).click();
  await expect(page.getByRole('status')).toContainText(/sačuvan/i);
});
test('active queue automatically shows a newly committed order and recovers from offline state', async ({
  page,
  seed,
  context,
  request,
}) => {
  test.setTimeout(60000);
  await login(page);
  await page.goto('/admin/orders?view=active');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const availability = await request.get(`/api/pickup-slots?date=${tomorrow}`);
  const slots = await availability.json();
  expect(slots.slots.length).toBeGreaterThan(0);
  const response = await request.post('/api/orders', {
    data: {
      idempotencyKey: crypto.randomUUID(),
      customerName: 'Novi kupac u redu',
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
  const order = await response.json();
  await expect(page.getByText(order.orderNumber, { exact: true })).toBeVisible({
    timeout: 25000,
  });
  await context.setOffline(true);
  await expect(
    page.getByText('Veza je prekinuta. Podaci možda nisu aktuelni.'),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText('Veza je prekinuta. Podaci možda nisu aktuelni.'),
  ).toBeHidden();
});
test('catalog preserves URL context and native cart modal retains keyboard boundaries after removal', async ({
  page,
  seed,
}) => {
  await page.goto('/proizvodi?q=kifla&sort=price-desc');
  await page
    .getByRole('navigation', { name: 'Filtriranje proizvoda po kategoriji' })
    .getByRole('link', { name: 'Integration kategorija' })
    .click();
  await expect(page).toHaveURL(/q=kifla/);
  await expect(page).toHaveURL(/sort=price-desc/);
  await expect(page).toHaveURL(/category=e2e-category/);
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue('kifla');
  const frame = page.getByRole('link', {
    name: `Pogledaj proizvod ${seed.availableProductName}`,
  });
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width / box!.height).toBeCloseTo(4 / 3, 1);
  await page
    .getByRole('button', { name: `Dodaj ${seed.availableProductName} u korpu` })
    .click();
  const trigger = page.getByRole('button', { name: /^Otvori korpu/ });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Korpa', exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(
    true,
  );
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await dialog.getByRole('button', { name: /Ukloni/ }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Korpa je prazna.')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Zatvori korpu' }),
  ).toBeFocused();
  await accessible(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
test('major public and admin screens remain usable at six widths with screenshots and axe', async ({
  page,
  seed,
}, info) => {
  test.setTimeout(420000);
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `login overflows at ${width}`,
    ).toBe(true);
    await accessible(page);
    await page.screenshot({
      path: info.outputPath(`${width}-login.png`),
      fullPage: true,
    });
  }
  await login(page);
  await page.goto('/proizvodi');
  await page
    .getByRole('button', { name: `Dodaj ${seed.availableProductName} u korpu` })
    .click();
  const routes = [
    '/',
    '/proizvodi',
    `/proizvodi/${seed.productSlug}`,
    '/korpa',
    '/checkout',
    `/porudzbina/${seed.orderId}`,
    '/admin',
    '/admin/orders?view=active',
    `/admin/orders/${seed.orderId}`,
    '/admin/products',
    `/admin/products/${seed.productId}`,
    '/admin/categories',
    '/admin/settings',
  ];
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [index, route] of routes.entries()) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (
        ['/', '/proizvodi', `/proizvodi/${seed.productSlug}`].includes(route)
      ) {
        const mobileCart = page.getByRole('button', { name: /^Korpa ·/ });
        if (width >= 1024) await expect(mobileCart).toBeHidden();
        else await expect(mobileCart).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} overflows at ${width}`,
      ).toBe(true);
      await accessible(page);
      await page.screenshot({
        path: info.outputPath(`${width}-${index}.png`),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/korpa');
  await page.evaluate(() => window.scrollTo(0, 350));
  const header = await page.locator('header').first().boundingBox();
  const summary = await page
    .getByRole('heading', { name: 'Pregled korpe' })
    .boundingBox();
  expect(summary!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
});

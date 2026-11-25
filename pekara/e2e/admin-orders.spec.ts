import { E2E_ADMIN } from './fixtures/auth.ts';
import { expect, test } from './fixtures/db.ts';

test('admin logs in, updates a new order and sees persisted status after reload', async ({
  page,
  seed,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/orders');
  await page.getByRole('link', { name: seed.orderNumber }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/orders/${seed.orderId}\\?returnTo=`),
  );
  await page.getByRole('button', { name: 'Prihvati porudžbinu' }).click();
  await expect(page.locator('main').getByRole('status')).toHaveText(
    'Status je sačuvan.',
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Započni pripremu' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Istorija statusa' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Otkaži porudžbinu' }).click();
  await page.getByLabel('Razlog otkazivanja').fill('E2E razlog otkazivanja');
  await page.getByRole('button', { name: 'Potvrdi otkazivanje' }).click();
  await expect(
    page.getByText('Razlog otkazivanja: E2E razlog otkazivanja'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(
      'Porudžbina je u terminalnom statusu i više se ne može menjati.',
    ),
  ).toBeVisible();
  await page.goto(`/porudzbina/${seed.orderId}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Porudžbina je otkazana',
  );
});

test('invalid login is rejected without opening admin pages', async ({
  page,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill('pogresna-lozinka');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'nisu ispravni',
  );
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('mobile admin uses active queue cards and keeps history filters', async ({
  page,
  seed,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/admin/orders?view=active');
  await expect(
    page.getByRole('heading', { name: 'Aktivne porudžbine' }),
  ).toBeVisible();
  await expect(page.getByText(seed.orderNumber).first()).toBeVisible();
  await page
    .getByRole('link', { name: new RegExp(`Otvori.*${seed.orderNumber}`) })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/orders/${seed.orderId}\\?returnTo=`),
  );

  await page.goto('/admin/orders?view=all');
  await expect(
    page.getByRole('link', { name: 'Sve porudžbine' }),
  ).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Status').selectOption('NEW');
  await expect(page).toHaveURL(/status=NEW/);
  await expect(page.getByText(seed.orderNumber).first()).toBeVisible();
});

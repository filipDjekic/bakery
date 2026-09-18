import { E2E_ADMIN } from './fixtures/auth.ts';
import { expect, test } from './fixtures/db.ts';

test('admin logs in, updates a new order and sees persisted status after reload', async ({ page, seed }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await page.goto('/admin/orders');
  await page.getByRole('link', { name: seed.orderNumber }).click();
  await expect(page).toHaveURL(`/admin/orders/${seed.orderId}`);
  await page.getByRole('button', { name: 'Postavi status ACCEPTED' }).click();
  await expect(page.getByRole('status')).toHaveText('Status je sačuvan.');
  await page.reload();
  await expect(page.getByText('Status:')).toContainText('ACCEPTED');
});

test('invalid login is rejected without opening admin pages', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill('pogresna-lozinka');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page.getByRole('alert')).toContainText('nisu ispravni');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

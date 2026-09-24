import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { E2E_ADMIN } from '../../e2e/fixtures/auth.ts';
import { expect, test } from '../../e2e/fixtures/db.ts';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
}

test('public catalog, cart and checkout have accessible keyboard boundaries', async ({
  page,
  seed,
}) => {
  await page.goto('/proizvodi');
  const addButton = page.getByRole('button', {
    name: `Dodaj ${seed.availableProductName} u korpu`,
  });
  await addButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('dodat u korpu');
  await expectNoSeriousViolations(page);

  await page.goto('/checkout');
  await expect(page.getByLabel('Ime i prezime')).toBeVisible();
  await expect(page.getByLabel('Telefon')).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Termin preuzimanja' }),
  ).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('admin cancellation dialog traps keyboard focus and is labelled', async ({
  page,
  seed,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Lozinka').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await page.goto(`/admin/orders/${seed.orderId}`);
  const trigger = page.getByRole('button', { name: 'Otkaži porudžbinu' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Otkazivanje porudžbine' });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Razlog otkazivanja')).toBeFocused();
  await expectNoSeriousViolations(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('mobile navigation closes with Escape and restores trigger focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Otvori navigaciju' });
  await trigger.click();
  await expect(
    page.getByRole('navigation', { name: 'Mobilna navigacija' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('navigation', { name: 'Mobilna navigacija' }),
  ).toBeHidden();
  await expect(trigger).toBeFocused();
});

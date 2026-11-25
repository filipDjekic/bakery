import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { Client } from 'pg';
import { getIntegrationDatabaseUrl } from '../tests/helpers/db';
import { E2E_ADMIN } from './fixtures/auth';
import { test, expect } from './fixtures/db';

test('request memoization never shares an admin session or retains a disabled user across requests', async ({
  page,
  browser,
}) => {
  const env = parse(readFileSync('.env.test'));
  const client = new Client({
    connectionString: getIntegrationDatabaseUrl({
      ...env,
      ...process.env,
      NODE_ENV: 'test',
    }),
  });
  await client.connect();
  const anonymous = await browser.newContext();
  try {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByLabel('Lozinka').fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Prijavi se' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.reload();
    await expect(page).toHaveURL(/\/admin$/);
    const otherPage = await anonymous.newPage();
    await otherPage.goto('http://127.0.0.1:3000/admin');
    await expect(otherPage).toHaveURL(/\/admin\/login$/);
    const result = await client.query(
      'UPDATE "user" SET "isActive"=false WHERE email=$1',
      [E2E_ADMIN.email],
    );
    expect(result.rowCount).toBe(1);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  } finally {
    await client.query('UPDATE "user" SET "isActive"=true WHERE email=$1', [
      E2E_ADMIN.email,
    ]);
    await anonymous.close();
    await client.end();
  }
});

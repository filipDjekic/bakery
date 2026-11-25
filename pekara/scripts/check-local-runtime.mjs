import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const env = parse(readFileSync('.env'));
const baseURL = env.APP_URL;
assert.equal(new URL(baseURL).hostname, 'localhost');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL });
const page = await context.newPage();
try {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  assert.equal((await page.goto('/')).status(), 200);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.goto('/admin');
  await page.waitForURL('**/admin/login');
  await page.getByLabel('Email').fill(env.ADMIN_EMAIL);
  await page.getByLabel('Lozinka').fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await page.waitForURL(/\/admin$/);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.ok(page.url().endsWith('/admin'));
  const cookies = await context.cookies();
  const session = cookies.find((cookie) =>
    cookie.name.endsWith('session_token'),
  );
  assert.ok(session?.httpOnly);
  assert.equal(session.sameSite, 'Lax');
  assert.equal(session.secure, false); // explicit loopback HTTP only
  const secondPage = await context.newPage();
  assert.equal((await secondPage.goto('/admin')).status(), 200);
  assert.ok(secondPage.url().endsWith('/admin'));
  const rejected = await context.request.post('/api/auth/sign-in/email', {
    headers: { Origin: 'http://attacker.example' },
    data: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
  });
  assert.equal(rejected.status(), 403);
  assert.deepEqual(errors, []);
  mkdirSync('.cache/performance', { recursive: true });
  writeFileSync(
    '.cache/performance/runtime-smoke.json',
    JSON.stringify(
      {
        homepage: 'PASS',
        anonymousAdminRedirect: 'PASS',
        login: 'PASS',
        reloadAndNewPageSession: 'PASS',
        httpOnlySameSiteCookie: 'PASS',
        crossOriginRejected: 'PASS',
        pageErrors: errors.length,
      },
      null,
      2,
    ),
  );
  console.log(
    'Local production browser smoke: PASS (homepage, login, dashboard, persistent session, cookie policy, origin rejection).',
  );
} finally {
  await context.request.post('/api/auth/sign-out', {
    headers: { Origin: baseURL },
    data: {},
  });
  await browser.close();
}

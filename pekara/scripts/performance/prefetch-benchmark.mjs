import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, baseURL, save, agent } from './common.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: baseURL.origin,
  viewport: { width: 1440, height: 1000 },
});
const requests = [];
context.on('request', (req) => {
  const url = new URL(req.url());
  if (url.origin !== baseURL.origin || !req.headers()['rsc']) return;
  requests.push({
    path: url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id'),
    prefetch: req.headers()['next-router-prefetch'] === '1',
  });
});
try {
  const signIn = await context.request.post('/api/auth/sign-in/email', {
    headers: { Origin: baseURL.origin },
    data: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
  });
  assert.equal(signIn.status(), 200);
  const page = await context.newPage();
  await page.goto('/admin/orders?view=all');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.waitForTimeout(1500);
  const list = [...requests];
  const link = page.locator('main a[href^="/admin/orders/"]:visible').first();
  const start = performance.now();
  await link.click();
  await page.getByRole('heading', { name: 'Istorija statusa' }).waitFor();
  save(process.argv[2], {
    viewport: '1440x1000',
    settleMs: 1500,
    listRequests: list,
    listPrefetches: list.filter((r) => r.prefetch).length,
    orderDetailPrefetches: list.filter(
      (r) => r.prefetch && r.path === '/admin/orders/:id',
    ).length,
    clickToOrderHistoryMs: performance.now() - start,
  });
  console.log(`Prefetch diagnostic saved: ${process.argv[2]}`);
} finally {
  await context.request.post('/api/auth/sign-out', {
    headers: { Origin: baseURL.origin },
    data: {},
  });
  await browser.close();
  agent.destroy();
}

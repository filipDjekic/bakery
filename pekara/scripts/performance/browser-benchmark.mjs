import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import {
  metadata,
  routes,
  baseURL,
  login,
  stats,
  save,
  agent,
} from './common.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const output = process.argv[2];
assert.ok(output?.endsWith('.json'));
const meta = await metadata();
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: baseURL.origin,
  viewport: { width: 1440, height: 1000 },
});
await context.addInitScript(() => {
  window.__metrics = { lcp: null, cls: 0, events: [] };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      window.__metrics.lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      if (!entry.hadRecentInput) window.__metrics.cls += entry.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      window.__metrics.events.push(entry.duration);
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', () => errors.push('pageerror'));
const result = {};
try {
  for (const [name, path, auth] of routes(meta).filter(
    ([name]) => !['pickup', 'admin-anonymous'].includes(name),
  )) {
    if (auth && !result.signedIn) {
      const signedIn = await login();
      await context.addCookies(
        signedIn.cookie.split('; ').map((entry) => {
          const equal = entry.indexOf('=');
          return {
            name: entry.slice(0, equal),
            value: entry.slice(equal + 1),
            url: baseURL.origin,
            httpOnly: true,
            sameSite: 'Lax',
          };
        }),
      );
      result.signedIn = true;
    }
    const samples = [];
    for (let i = 0; i < 5; i++) {
      await page.goto(path, { waitUntil: 'load' });
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.waitForTimeout(300);
      samples.push(
        await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource');
          return {
            ttfbMs: nav.responseStart,
            responseEndMs: nav.responseEnd,
            domContentLoadedMs: nav.domContentLoadedEventEnd,
            loadMs: nav.loadEventEnd,
            fcpMs:
              performance.getEntriesByName('first-contentful-paint')[0]
                ?.startTime ?? null,
            lcpMs: window.__metrics.lcp,
            cls: window.__metrics.cls,
            jsTransferBytes: resources
              .filter((r) => r.name.includes('.js'))
              .reduce((s, r) => s + r.transferSize, 0),
            jsDecodedBytes: resources
              .filter((r) => r.name.includes('.js'))
              .reduce((s, r) => s + r.decodedBodySize, 0),
            scriptRequests: resources.filter((r) => r.name.includes('.js'))
              .length,
            fetchRequests: resources.filter((r) => r.initiatorType === 'fetch')
              .length,
            externalHosts: [
              ...new Set(
                resources
                  .map((r) => new URL(r.name).host)
                  .filter((h) => h !== location.host),
              ),
            ],
          };
        }),
      );
    }
    result[name] = {
      coldBrowser: samples[0],
      warmSamples: samples.slice(1),
      warm: Object.fromEntries(
        [
          'ttfbMs',
          'responseEndMs',
          'loadMs',
          'fcpMs',
          'lcpMs',
          'cls',
          'jsDecodedBytes',
        ].map((key) => [
          key,
          stats(
            samples
              .slice(1)
              .map((s) => s[key])
              .filter((v) => v !== null),
          ),
        ]),
      ),
    };
  }
  await page.goto('/proizvodi');
  await page
    .getByRole('button', { name: /^Dodaj .* u korpu$/ })
    .first()
    .click();
  await page.waitForTimeout(300);
  result.interaction = await page.evaluate(() => ({
    observedEventDurationsMs: window.__metrics.events,
    note: 'Single lab click. EventTiming is not field INP; empty means no event exceeded 16ms.',
  }));
  result.errors = errors.length;
  delete result.signedIn;
  save(output, {
    browser: browser.version(),
    viewport: '1440x1000',
    throttle: 'none',
    sampleCount: 5,
    settledAfterLoadMs: 300,
    results: result,
  });
  console.log(
    `Browser benchmark saved: ${output}; page errors: ${errors.length}`,
  );
  assert.equal(errors.length, 0);
} finally {
  await context.request.post('/api/auth/sign-out', {
    headers: { Origin: baseURL.origin },
    data: {},
  });
  await browser.close();
  agent.destroy();
}

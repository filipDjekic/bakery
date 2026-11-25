import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseURL = process.env.BENCH_APP_URL ?? 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname));
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch();
const samples = [];
try {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1440, height: 1000 },
    });
    try {
      await context.addInitScript(() => {
        window.__interactionAudit = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            window.__interactionAudit.push({
              name: e.name,
              interactionId: e.interactionId,
              durationMs: e.duration,
              inputDelayMs: e.processingStart - e.startTime,
              processingMs: e.processingEnd - e.processingStart,
            });
        }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', () => errors.push('pageerror'));
      await page.goto('/proizvodi');
      await page.getByRole('heading', { level: 1 }).waitFor();
      for (let i = 0; i < 3; i++) {
        await page
          .getByRole('button', { name: /^Dodaj .* u korpu$/ })
          .first()
          .click();
        await page.waitForTimeout(150);
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => ({
        entries: window.__interactionAudit,
        browserInteractionCount: performance.interactionCount ?? null,
      }));
      const grouped = new Map();
      for (const e of data.entries)
        if (e.interactionId)
          grouped.set(
            e.interactionId,
            Math.max(grouped.get(e.interactionId) ?? 0, e.durationMs),
          );
      // Fewer than 50 scripted interactions: INP is the maximum interaction
      // latency. Events below the API's 16 ms threshold may be absent; never
      // fabricate a zero when no reportable event was observed.
      assert.ok((data.browserInteractionCount ?? grouped.size) < 50);
      const max = Math.max(0, ...grouped.values());
      samples.push({
        ...data,
        measuredInteractions: [...grouped].map(
          ([interactionId, durationMs]) => ({ interactionId, durationMs }),
        ),
        labSessionINPMs: max >= 16 ? max : null,
        belowReportingThreshold: max < 16,
        pageErrors: errors.length,
      });
      assert.equal(errors.length, 0);
    } finally {
      await context.close();
    }
  }
  mkdirSync('performance-results', { recursive: true });
  writeFileSync(
    'performance-results/audit-interactions.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        runtime: 'local production',
        browser: browser.version(),
        viewport: '1440x1000',
        throttle: 'none',
        workload:
          'Three add-to-cart clicks and Escape keys on catalog, three fresh contexts; no checkout submission.',
        eventThresholdMs: 16,
        samples,
        limitation:
          'Current short scripted page sessions only. No historical interactionId baseline and no field INP p75. Null means below reporting threshold, not zero.',
        methodology: 'https://web.dev/articles/inp',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify(
      samples.map((s) => ({
        labSessionINPMs: s.labSessionINPMs,
        belowReportingThreshold: s.belowReportingThreshold,
        interactionCount: s.browserInteractionCount,
        pageErrors: s.pageErrors,
      })),
    ),
  );
} finally {
  await browser.close();
}

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

if (
  !process.env.CI &&
  !process.env.PLAYWRIGHT_BROWSERS_PATH &&
  existsSync('.cache/ms-playwright')
)
  process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.cache/ms-playwright');

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/accessibility/**/*.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node --experimental-strip-types scripts/start-e2e-server.mjs',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: process.env.E2E_EXTERNAL_SERVER === 'true',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 1000 },
    timeout: 120_000,
  },
});

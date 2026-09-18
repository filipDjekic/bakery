import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  createContentSecurityPolicy,
  createSecurityHeaders,
} from './security-headers.ts';

test('production CSP restricts executable content and permits required image and telemetry origins', () => {
  const csp = createContentSecurityPolicy('production');
  const scriptSource = csp
    .split('; ')
    .find((directive) => directive.startsWith('script-src'));

  assert.equal(scriptSource, "script-src 'self' 'unsafe-inline'");
  assert.equal(scriptSource?.includes('unsafe-eval'), false);
  assert.equal(scriptSource?.includes('https:'), false);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /https:\/\/\*\.public\.blob\.vercel-storage\.com/);
  assert.match(csp, /https:\/\/\*\.ingest\.sentry\.io/);
  assert.match(csp, /upgrade-insecure-requests/);
});

test('development-only directives do not leak into production', () => {
  const development = createContentSecurityPolicy('development');
  const production = createContentSecurityPolicy('production');
  assert.match(development, /'unsafe-eval'/);
  assert.match(development, /connect-src[^;]+ ws: wss:/);
  assert.equal(production.includes("'unsafe-eval'"), false);
  assert.equal(production.includes(' ws:'), false);
});

test('all requested browser security headers are configured globally', () => {
  const headers = new Map(
    createSecurityHeaders('production').map(({ key, value }) => [key, value]),
  );
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(
    headers.get('Referrer-Policy'),
    'strict-origin-when-cross-origin',
  );
  assert.match(headers.get('Permissions-Policy') ?? '', /camera=\(\)/);
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.ok(headers.has('Content-Security-Policy'));
});

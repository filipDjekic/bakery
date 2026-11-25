import assert from 'node:assert/strict';
import os from 'node:os';
import {
  agent,
  metadata,
  request,
  routes,
  login,
  logout,
  stats,
  save,
} from './common.mjs';

const output = process.argv[2];
assert.ok(output?.endsWith('.json'), 'Pass an output JSON path.');
const n = Number(process.env.BENCH_SAMPLES ?? 20);
assert.ok(Number.isInteger(n) && n >= 3 && n <= 100);
const meta = await metadata();
const workload = routes(meta);
const results = {};
let cookie;
try {
  for (const [name, path, authenticated, expectedStatus = 200] of workload) {
    if (authenticated && !cookie) {
      const signedIn = await login();
      cookie = signedIn.cookie;
      const { headersMs, ttfbMs, totalMs } = signedIn.result;
      results['login-post'] = {
        cold: { headersMs, ttfbMs, totalMs },
        samples: [],
      };
    }
    const res = await request(path, {
      cookie: authenticated ? cookie : undefined,
    });
    assert.ok(
      name === 'admin-anonymous'
        ? [200, 307].includes(res.status) &&
            (res.status === 307
              ? res.headers.location === '/admin/login'
              : res.body.includes('/admin/login'))
        : res.status === expectedStatus,
      `${name} HTTP status ${res.status}`,
    );
    results[name] = {
      authenticated: !!authenticated,
      cold: {
        headersMs: res.headersMs,
        ttfbMs: res.ttfbMs,
        totalMs: res.totalMs,
        bytes: res.bytes,
        streamedErrorMarker: res.body.includes('data-next-error-message'),
      },
      samples: [],
    };
  }
  for (let round = 0; round < n; round++) {
    for (const [name, path, authenticated, expectedStatus = 200] of workload) {
      const res = await request(path, {
        cookie: authenticated ? cookie : undefined,
      });
      assert.ok(
        name === 'admin-anonymous'
          ? [200, 307].includes(res.status)
          : res.status === expectedStatus,
        `${name} HTTP status ${res.status}`,
      );
      results[name].samples.push({
        headersMs: res.headersMs,
        ttfbMs: res.ttfbMs,
        totalMs: res.totalMs,
        bytes: res.bytes,
      });
    }
  }
  // Three sign-ins total stay below the existing 5/minute password rate limit.
  for (let i = 0; i < 2; i++) {
    const signedIn = await login();
    results['login-post'].samples.push({
      headersMs: signedIn.result.headersMs,
      ttfbMs: signedIn.result.ttfbMs,
      totalMs: signedIn.result.totalMs,
    });
    await logout(signedIn.cookie);
  }
  for (const value of Object.values(results))
    value.warm = Object.fromEntries(
      ['headersMs', 'ttfbMs', 'totalMs'].map((key) => [
        key,
        stats(value.samples.map((s) => s[key])),
      ]),
    );
  save(output, {
    recordedAt: new Date().toISOString(),
    conditions: {
      node: process.version,
      platform: process.platform,
      cpu: os.cpus()[0].model,
      logicalCPUs: os.cpus().length,
      memoryGB: Math.round(os.totalmem() / 2 ** 30),
      n,
      concurrency: 1,
      keepAlive: true,
      firstHit:
        'First route request after server restart; shared initialization and build cache may already be warm.',
      noBrowser: true,
    },
    dataFingerprint: meta.counts,
    results,
  });
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(results).map(([name, r]) => [
          name,
          { coldTotal: Math.round(r.cold.totalMs), warm: r.warm.totalMs },
        ]),
      ),
    ),
  );
} finally {
  if (cookie) await logout(cookie);
  agent.destroy();
}

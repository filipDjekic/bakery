// Read-only audit of saved measurements; never connects to a database.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const read = (name) =>
  JSON.parse(readFileSync(`performance-results/${name}.json`, 'utf8'));
const stats = (values) => {
  const a = [...values].sort((a, b) => a - b);
  const round = (n) => Math.round(n * 100) / 100;
  return {
    n: a.length,
    min: round(a[0]),
    median: round(
      a.length % 2
        ? a[(a.length - 1) / 2]
        : (a[a.length / 2 - 1] + a[a.length / 2]) / 2,
    ),
    p95: round(a[Math.ceil(a.length * 0.95) - 1]),
    max: round(a.at(-1)),
  };
};
const http = {};
for (const mode of ['development', 'production']) {
  const a = read(`baseline-${mode}`),
    b = read(`after-${mode}`);
  assert.deepEqual(a.conditions, b.conditions);
  assert.deepEqual(a.dataFingerprint, b.dataFingerprint);
  assert.deepEqual(Object.keys(a.results), Object.keys(b.results));
  for (const cohort of [a, b])
    for (const [key, r] of Object.entries(cohort.results)) {
      assert.equal(r.samples.length, key === 'login-post' ? 2 : 20);
      for (const metric of ['headersMs', 'ttfbMs', 'totalMs'])
        assert.deepEqual(
          stats(r.samples.map((v) => v[metric])),
          r.warm[metric],
        );
    }
  http[mode] = {
    conditionsEqual: true,
    businessFingerprintsEqual: true,
    routeSetsEqual: true,
    allWarmStatisticsRecomputed: true,
    beforeRecordedAt: a.recordedAt,
    afterRecordedAt: b.recordedAt,
    routeCount: Object.keys(a.results).length,
  };
}
for (const stage of ['baseline', 'after']) {
  for (const mode of ['development', 'production']) {
    const r = read(`${stage}-cold-${mode}`);
    assert.equal(r.restarts, 3);
    for (const v of Object.values(r.routes)) {
      assert.equal(v.samples.length, 3);
      for (const metric of ['ttfbMs', 'totalMs'])
        assert.deepEqual(stats(v.samples.map((s) => s[metric])), v[metric]);
    }
  }
  const r = read(`${stage}-orders`);
  assert.equal(r.samples.length, 5);
  assert.deepEqual(
    stats(r.samples.slice(1).map((s) => s.totalMs)),
    r.warm.totalMs,
  );
}
const before = read('baseline-production'),
  after = read('after-production');
const targets = [
  ['Početna strana', 'home', 250],
  ['Katalog', 'catalog', 250],
  ['Detalj proizvoda', 'product', 200],
  ['Admin dashboard', 'dashboard', 300],
  ['Lista porudžbina', 'orders', 300],
  ['Pickup slots', 'pickup', 150],
  ['Kreiranje porudžbine', 'order-create', 500],
  ['Prijava (POST)', 'login-post', 600],
].map(([operation, key, targetMs]) => {
  const a =
    key === 'order-create'
      ? read('baseline-orders').warm.totalMs
      : before.results[key].warm.totalMs;
  const b =
    key === 'order-create'
      ? read('after-orders').warm.totalMs
      : after.results[key].warm.totalMs;
  return {
    operation,
    key,
    targetMs,
    before: a,
    after: b,
    medianReductionMs: Number((a.median - b.median).toFixed(2)),
    medianReductionPercent: Number(
      (((a.median - b.median) / a.median) * 100).toFixed(2),
    ),
    achievedForMedianAndP95: b.median < targetMs && b.p95 < targetMs,
  };
});
const profileA = read('baseline-production-profile'),
  profileB = read('after-production-profile');
const sqlCounts = Object.entries(profileA.routes).map(([request, r]) => ({
  request,
  before: r.warmQueryCounts,
  after: profileB.routes[request]?.warmQueryCounts ?? [],
}));
const connections = {};
for (const stage of ['baseline', 'after']) {
  const rows = readFileSync(
    `.cache/performance/${stage}-production-sql.ndjson`,
    'utf8',
  )
    .trim()
    .split('\n')
    .map(JSON.parse);
  let finished = 0;
  const positions = [];
  for (const row of rows) {
    if (row.type === 'request') finished++;
    if (row.type === 'connect') positions.push(finished);
  }
  connections[stage] = {
    driverDurationMs: (stage === 'baseline' ? profileA : profileB).connections,
    connectionCompletionsAfterNFinishedRequests: positions,
    newConnectionsAfterInitial15Operations: positions.filter((n) => n >= 15)
      .length,
  };
  assert.equal(connections[stage].newConnectionsAfterInitial15Operations, 0);
}
const browserA = read('baseline-browser'),
  browserB = read('after-browser');
assert.equal(browserA.browser, browserB.browser);
assert.equal(browserA.viewport, browserB.viewport);
assert.equal(browserA.throttle, browserB.throttle);
assert.equal(browserA.results.errors, 0);
assert.equal(browserB.results.errors, 0);
for (const r of [browserA, browserB])
  for (const [key, value] of Object.entries(r.results)) {
    if (['interaction', 'errors'].includes(key)) continue;
    for (const [metric, aggregate] of Object.entries(value.warm))
      assert.deepEqual(
        stats(
          value.warmSamples.map((s) => s[metric]).filter((s) => s !== null),
        ),
        aggregate,
      );
  }
const security = read('audit-security-unit');
assert.equal(security.success, true);
assert.equal(security.numFailedTests, 0);
const interactions = read('audit-interactions');
assert.equal(interactions.samples.length, 3);
for (const sample of interactions.samples) {
  assert.equal(sample.pageErrors, 0);
  assert.ok(sample.browserInteractionCount < 50);
  assert.equal(
    sample.labSessionINPMs,
    Math.max(...sample.measuredInteractions.map((i) => i.durationMs)),
  );
}
const snapshot = [
  'baseline-production',
  'after-production',
  'baseline-development',
  'after-development',
  'baseline-cold-production',
  'after-cold-production',
  'baseline-cold-development',
  'after-cold-development',
  'baseline-production-profile',
  'after-production-profile',
  'baseline-browser',
  'after-browser',
  'baseline-orders',
  'after-orders',
  'baseline-orders-profile',
  'after-orders-profile',
  'baseline-sql-scale',
  'after-sql-scale',
  'baseline-prefetch',
  'after-prefetch',
].map((name) => {
  const path = `performance-results/${name}.json`;
  return {
    path,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  };
});
const result = {
  recordedAt: new Date().toISOString(),
  http,
  coldStatisticsRecomputed: true,
  orderStatisticsRecomputed: true,
  browserStatisticsRecomputed: true,
  targets,
  sqlCounts,
  connections,
  sqlQueryTimings: profileA.queries.map((q, index) => ({
    index,
    sql: q.sql,
    before: q,
    after: profileB.queries.find((v) => v.sql === q.sql) ?? null,
  })),
  security: {
    passed: security.numPassedTests,
    failed: security.numFailedTests,
    testFiles: security.testResults.map((r) =>
      r.name.replace(process.cwd().replaceAll('\\', '/') + '/', ''),
    ),
  },
  supplementaryDevelopmentOrders: read('audit-development-orders'),
  currentLabSessionINP: {
    statisticsMs: stats(interactions.samples.map((s) => s.labSessionINPMs)),
    source: 'performance-results/audit-interactions.json',
    limitation: interactions.limitation,
  },
  snapshot,
  limitations: [
    'Historical pre-optimization development order-creation baseline does not exist.',
    'Cold means fresh process or first operation, with persistent OS/build/DB caches; not a cold machine.',
    'Browser warm reload workload matches, but initial authentication setup changed; no first-navigation speedup claim.',
    'Order profiles/standalone SQL workloads share fixture and scripts; per-cohort OS load/build hash was not saved.',
    'Historical EventTiming arrays have no interaction IDs; no historical INP baseline/percentile can be reconstructed. A separate current lab session audit is available.',
    'Original per-test E2E/a11y stdout/durations unavailable; aggregate passed markers and test list survive.',
  ],
};
writeFileSync(
  'performance-results/audit-evidence.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  `Audit PASS: all saved statistics recomputed; ${targets.length} targets; ${security.numPassedTests} focused security tests.`,
);

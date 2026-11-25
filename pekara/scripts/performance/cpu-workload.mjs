import { request, login, logout, agent, save } from './common.mjs';
const { cookie } = await login();
const start = performance.now();
let requests = 0;
try {
  while (performance.now() - start < 45_000) {
    for (const path of ['/admin', '/checkout', '/']) {
      await request(path, { cookie });
      requests++;
    }
  }
  save('.cache/performance/cpu-workload.json', {
    requests,
    durationMs: performance.now() - start,
  });
} finally {
  await logout(cookie);
  agent.destroy();
}

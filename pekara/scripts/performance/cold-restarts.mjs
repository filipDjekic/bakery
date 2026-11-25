import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  openSync,
  closeSync,
  readFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import net from 'node:net';
const mode = process.argv[2];
const output = process.argv[3];
assert.ok(['development', 'production'].includes(mode));
const port = Number(process.env.BENCH_PORT ?? 3100);
process.env.APP_URL = `http://localhost:${port}`;
process.env.BETTER_AUTH_URL = process.env.APP_URL;
const { metadata, routes, request, login, logout, agent, save, stats } =
  await import('./common.mjs');
const meta = await metadata();
const values = {};
const startup = [];
let cookie;
mkdirSync('.cache/performance', { recursive: true });
for (let cycle = 0; cycle < 3; cycle++) {
  const path = `.cache/performance/${mode}-cold-${cycle}.log`;
  const pidPath = `.cache/performance/${mode}-cold-${cycle}.pid`;
  if (existsSync(pidPath)) unlinkSync(pidPath);
  const occupied = await new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
  assert.equal(
    occupied,
    false,
    'Cold benchmark port is occupied; refusing to measure another process.',
  );
  const log = openSync(path, 'w');
  const started = performance.now();
  const child = spawn(
    process.execPath,
    [
      '--import',
      './scripts/performance/server-owner.mjs',
      ...(mode === 'production'
        ? ['scripts/local-runtime.mjs', 'start']
        : [
            'node_modules/next/dist/bin/next',
            'dev',
            '--hostname',
            '127.0.0.1',
            '--port',
            String(port),
          ]),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: mode,
        NEXT_TELEMETRY_DISABLED: '1',
        PERF_SERVER_PORT: String(port),
        PERF_SERVER_PID_FILE: pidPath,
      },
      stdio: ['ignore', log, log],
      windowsHide: true,
    },
  );
  closeSync(log);
  try {
    let listening = false;
    while (
      (!listening || (mode === 'production' && !existsSync(pidPath))) &&
      performance.now() - started < 45_000
    ) {
      listening = await new Promise((resolve) => {
        const socket = net.connect(port, '127.0.0.1');
        socket.once('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.once('error', () => resolve(false));
      });
      if (!listening || (mode === 'production' && !existsSync(pidPath)))
        await new Promise((done) => setTimeout(done, 100));
    }
    assert.ok(listening, 'Owned cold server failed to start.');
    if (mode === 'production')
      assert.ok(existsSync(pidPath), 'Expected owned server PID proof.');
    startup.push({ tcpListeningMs: performance.now() - started });
    for (const [name, path, authenticated, status = 200] of routes(meta)) {
      if (authenticated && !cookie) cookie = (await login()).cookie;
      const res = await request(path, {
        cookie: authenticated ? cookie : undefined,
      });
      assert.ok(
        name === 'admin-anonymous'
          ? [200, 307].includes(res.status)
          : res.status === status,
      );
      (values[name] ??= []).push({ ttfbMs: res.ttfbMs, totalMs: res.totalMs });
    }
    if (cycle === 2 && cookie) await logout(cookie);
  } finally {
    // The listener PID is recorded by the preload inside our own process tree.
    if (existsSync(pidPath)) {
      try {
        process.kill(Number(readFileSync(pidPath, 'utf8')));
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    if (child.exitCode === null) child.kill();
    await new Promise((done) => setTimeout(done, 500));
    agent.destroy();
  }
  const logText = readFileSync(path, 'utf8');
  startup[cycle].nextReady = /Ready in ([^\r\n]+)/.exec(logText)?.[1];
  startup[cycle].configTime = /Running next.config.ts took ([^\r\n]+)/.exec(
    logText,
  )?.[1];
}
save(output, {
  mode,
  restarts: 3,
  port,
  conditions:
    'Fresh process each cycle; persistent build/compiler and PostgreSQL OS caches retained. Routes run in the same order. No HTTP readiness request. Authentication session persists across restarts.',
  startup,
  routes: Object.fromEntries(
    Object.entries(values).map(([name, samples]) => [
      name,
      {
        samples,
        ttfbMs: stats(samples.map((s) => s.ttfbMs)),
        totalMs: stats(samples.map((s) => s.totalMs)),
      },
    ]),
  ),
});
console.log(`Three cold process restarts saved: ${output}`);

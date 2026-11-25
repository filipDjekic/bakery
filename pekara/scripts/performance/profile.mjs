// Optional diagnostic preload. It is never imported by application code.
import { AsyncLocalStorage } from 'node:async_hooks';
import http from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import pg from 'pg';
import { createRequire } from 'node:module';
import inspector from 'node:inspector';
import { writeFileSync } from 'node:fs';

const output = process.env.PERF_PROFILE;
if (!output)
  throw new Error(
    'PERF_PROFILE output path is required for diagnostic profiling.',
  );
mkdirSync(output.substring(0, output.lastIndexOf('/')), { recursive: true });
const context = new AsyncLocalStorage();
const write = (record) => appendFileSync(output, JSON.stringify(record) + '\n');
const scrub = (sql) =>
  sql.replace(/'(?:''|[^'])*'/g, '?').replace(/\b\d+\b/g, '?');
const require = createRequire(import.meta.url);
const domainRequire = createRequire(
  require.resolve('@prisma/orm-postgres/runtime'),
);
// Prisma 8 owns pg 8.22; the auth adapter uses the application's pg 8.23.
for (const driver of new Set([pg, domainRequire('pg')])) {
  const query = driver.Client.prototype.query;
  driver.Client.prototype.query = function (...args) {
    const scope = context.getStore();
    const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
    const started = performance.now();
    const done = () => {
      const durationMs = performance.now() - started;
      const record = {
        type: 'sql',
        request: scope?.id,
        durationMs,
        sql: scrub(text ?? '<unknown>'),
      };
      if (scope) scope.queries.push(record);
      write(record);
    };
    const callbackIndex = args.length - 1;
    if (typeof args[callbackIndex] === 'function') {
      const callback = args[callbackIndex];
      args[callbackIndex] = function (...values) {
        done();
        return callback.apply(this, values);
      };
      return query.apply(this, args);
    }
    const result = query.apply(this, args);
    if (result?.then)
      return result.then(
        (value) => {
          done();
          return value;
        },
        (error) => {
          done();
          throw error;
        },
      );
    return result;
  };
  const connect = driver.Client.prototype.connect;
  driver.Client.prototype.connect = function (...args) {
    const started = performance.now();
    const done = () =>
      write({ type: 'connect', durationMs: performance.now() - started });
    if (typeof args[0] === 'function') {
      const callback = args[0];
      args[0] = function (...values) {
        done();
        return callback.apply(this, values);
      };
      return connect.apply(this, args);
    }
    return connect.apply(this, args).then((value) => {
      done();
      return value;
    });
  };
}
const emit = http.Server.prototype.emit;
let id = 0;
http.Server.prototype.emit = function (event, req, res, ...args) {
  if (event !== 'request') return emit.call(this, event, req, res, ...args);
  const scope = { id: ++id, queries: [] };
  const started = performance.now();
  res.once('finish', () =>
    write({
      type: 'request',
      id: scope.id,
      method: req.method,
      path: new URL(req.url, 'http://localhost').pathname.replace(
        /[0-9a-f]{8}-[0-9a-f-]{27,}/gi,
        ':id',
      ),
      status: res.statusCode,
      durationMs: performance.now() - started,
      queries: scope.queries.length,
      sqlMs: scope.queries.reduce((sum, q) => sum + q.durationMs, 0),
    }),
  );
  return context.run(scope, () => emit.call(this, event, req, res, ...args));
};
write({ type: 'profile-start', node: process.version });
if (process.env.PERF_CPU === 'true') {
  const session = new inspector.Session();
  session.connect();
  const post = (method) =>
    new Promise((resolve, reject) =>
      session.post(method, (error, result) =>
        error ? reject(error) : resolve(result),
      ),
    );
  setTimeout(async () => {
    await post('Profiler.enable');
    await post('Profiler.start');
    setTimeout(async () => {
      const { profile } = await post('Profiler.stop');
      writeFileSync(
        `${output}.${process.pid}.cpuprofile`,
        JSON.stringify(profile),
      );
      session.disconnect();
    }, 30_000).unref();
  }, 10_000).unref();
}

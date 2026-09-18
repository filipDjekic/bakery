import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ??
  'csrf-integration-test-secret-with-at-least-32-characters';
process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const { auth } = await import('../../src/server/auth/auth.ts');
const { getTrustedApplicationOrigins, hasTrustedMutationOrigin } =
  await import('../../src/server/auth/origin.ts');

function authMutation(origin: string): Request {
  return new Request('http://localhost:3000/api/auth/sign-out', {
    method: 'POST',
    headers: {
      cookie: 'better-auth.session_token=forged-session',
      origin,
    },
  });
}

test('Better Auth rejects a cookie-authenticated mutation with a forged Origin', async () => {
  const response = await auth.handler(authMutation('https://attacker.example'));

  assert.equal(response.status, 403);
});

test('the configured production domain is the only trusted production origin', () => {
  const origins = getTrustedApplicationOrigins(
    'https://orders.example.com',
    'production',
  );

  assert.deepEqual(origins, ['https://orders.example.com']);
  assert.equal(
    hasTrustedMutationOrigin(
      new Headers({ origin: 'https://orders.example.com' }),
      origins,
    ),
    true,
  );
  assert.equal(
    hasTrustedMutationOrigin(
      new Headers({ origin: 'https://admin.orders.example.com' }),
      origins,
    ),
    false,
  );
});

test('origin validation does not trust a reverse-proxy Host header', () => {
  const headers = new Headers({
    host: 'orders.example.com',
    origin: 'https://attacker.example',
    'x-forwarded-host': 'orders.example.com',
  });

  assert.equal(
    hasTrustedMutationOrigin(headers, ['https://orders.example.com']),
    false,
  );
});

test('production configuration requires an HTTPS origin without a path', () => {
  assert.throws(() => getTrustedApplicationOrigins('', 'production'));
  assert.throws(() =>
    getTrustedApplicationOrigins('http://orders.example.com', 'production'),
  );
  assert.throws(() =>
    getTrustedApplicationOrigins(
      'https://orders.example.com/admin',
      'production',
    ),
  );
  assert.deepEqual(
    getTrustedApplicationOrigins('http://localhost:3000', 'production'),
    ['http://localhost:3000'],
  );
});

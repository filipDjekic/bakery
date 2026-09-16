import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ??
  'integration-test-secret-with-at-least-32-characters';

const { auth, createBootstrapAuth } =
  await import('../../src/server/auth/auth.ts');
const { authPrisma } = await import('../../src/server/auth/prisma.ts');
const { AdminAlreadyExistsError, createFirstAdmin } =
  await import('../../scripts/create-admin.ts');

const suffix = `${Date.now()}-${crypto.randomUUID()}`;
const testIp = `198.51.100.${10 + Math.floor(Math.random() * 200)}`;
const rateLimitIp = `203.0.113.${10 + Math.floor(Math.random() * 200)}`;
const adminEmail = `auth-admin-${suffix}@example.test`;
const staffEmail = `auth-staff-${suffix}@example.test`;
const password = 'Strong-Test-Password-123!';
const createdUserIds: string[] = [];

function authRequest(
  path: string,
  body?: unknown,
  cookie?: string,
  clientIp = testIp,
): Request {
  const headers = new Headers({
    origin: 'http://localhost:3000',
    'x-forwarded-for': clientIp,
  });

  if (body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  if (cookie) {
    headers.set('cookie', cookie);
  }

  return new Request(`http://localhost:3000/api/auth${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  await authPrisma.user.deleteMany({
    where: { email: { in: [adminEmail, staffEmail] } },
  });
});

after(async () => {
  if (createdUserIds.length > 0) {
    await authPrisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  }

  await authPrisma.$disconnect();
});

test('public signup is disabled', async () => {
  const response = await auth.handler(
    authRequest('/sign-up/email', {
      email: staffEmail,
      name: 'Public Signup',
      password,
    }),
  );

  assert.equal(response.ok, false);
  assert.equal(
    await authPrisma.user.count({ where: { email: staffEmail } }),
    0,
  );
});

test('bootstrap creates exactly one admin without exposing the password', async () => {
  const existingAdmins = await authPrisma.user.count({
    where: { role: 'ADMIN' },
  });

  if (existingAdmins !== 0) {
    return;
  }

  const admin = await createFirstAdmin({
    email: adminEmail,
    name: 'Integration Admin',
    password,
  });
  createdUserIds.push(admin.id);

  const stored = await authPrisma.user.findUniqueOrThrow({
    where: { id: admin.id },
    include: { accounts: true },
  });

  assert.equal(stored.role, 'ADMIN');
  assert.equal(stored.isActive, true);
  assert.equal(
    stored.accounts.some((account) => account.password === password),
    false,
  );

  await assert.rejects(
    createFirstAdmin({
      email: `second-${adminEmail}`,
      name: 'Second Admin',
      password,
    }),
    AdminAlreadyExistsError,
  );
});

test('valid login creates a database session and logout invalidates it', async () => {
  const bootstrapAuth = createBootstrapAuth();
  const created = await bootstrapAuth.api.signUpEmail({
    body: { email: staffEmail, name: 'Integration Staff', password },
  });
  createdUserIds.push(created.user.id);

  const rateLimitsBefore = await authPrisma.rateLimit.count();
  const login = await auth.handler(
    authRequest('/sign-in/email', { email: staffEmail, password }),
  );
  const cookie = login.headers.get('set-cookie');

  assert.equal(login.status, 200);
  assert.ok(cookie);
  assert.ok((await authPrisma.rateLimit.count()) > rateLimitsBefore);

  const sessionResponse = await auth.handler(
    authRequest('/get-session', undefined, cookie),
  );
  const session = await sessionResponse.json();

  assert.equal(sessionResponse.status, 200);
  assert.equal(session.user.email, staffEmail);
  assert.equal(
    await authPrisma.session.count({ where: { userId: created.user.id } }),
    1,
  );

  const logout = await auth.handler(authRequest('/sign-out', {}, cookie));

  assert.equal(logout.status, 200);
  assert.equal(
    await authPrisma.session.count({ where: { userId: created.user.id } }),
    0,
  );
});

test('invalid credentials and inactive employees are rejected generically', async () => {
  const invalid = await auth.handler(
    authRequest('/sign-in/email', {
      email: staffEmail,
      password: 'Wrong-Password-123!',
    }),
  );

  assert.equal(invalid.ok, false);

  await authPrisma.user.update({
    where: { email: staffEmail },
    data: { isActive: false },
  });

  const inactive = await auth.handler(
    authRequest('/sign-in/email', { email: staffEmail, password }),
  );
  const body = JSON.stringify(await inactive.json());

  assert.equal(inactive.ok, false);
  assert.doesNotMatch(body, /inactive|disabled|exists/i);
});

test('repeated login attempts are limited through database storage', async () => {
  const statuses: number[] = [];

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await auth.handler(
      authRequest(
        '/sign-in/email',
        {
          email: `unknown-${suffix}@example.test`,
          password,
        },
        undefined,
        rateLimitIp,
      ),
    );
    statuses.push(response.status);
  }

  assert.ok(statuses.includes(429));
  assert.ok(await authPrisma.rateLimit.findFirst());
});

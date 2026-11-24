import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    account: { findMany: vi.fn(), updateMany: vi.fn() },
    session: { deleteMany: vi.fn() },
  };
  const context = {
    options: {} as {
      session?: { cookieCache?: { enabled: boolean } };
      secondaryStorage?: object;
    },
    password: {
      config: { minPasswordLength: 12, maxPasswordLength: 128 },
      hash: vi.fn<(password: string) => Promise<string>>(),
    },
  };
  return { tx, context, transaction: vi.fn() };
});

vi.mock('../../src/server/auth/auth.ts', () => ({
  auth: { $context: Promise.resolve(mock.context) },
}));
vi.mock('../../src/server/auth/prisma.ts', () => ({
  authPrisma: { $transaction: mock.transaction },
}));

import {
  AdminPasswordResetError,
  resetExistingAdminPassword,
  resetFailureMessage,
  validateLocalResetEnvironment,
} from '../../scripts/reset-admin-password';

const local = {
  DATABASE_URL: 'postgresql://test:unused@127.0.0.1:5432/local_bakery',
  APP_URL: 'http://localhost:3000',
  ADMIN_EMAIL: ' ADMIN@example.test ',
  ADMIN_PASSWORD: ' A-Local-Test-Password-123! ',
};
const input = { email: 'admin@example.test', password: local.ADMIN_PASSWORD };

beforeEach(() => {
  vi.resetAllMocks();
  mock.context.options = {};
  mock.context.password.hash.mockImplementation(hashPassword);
  mock.tx.$queryRaw.mockResolvedValue([
    { id: 'original-admin-id', role: 'ADMIN' },
  ]);
  mock.tx.account.findMany.mockResolvedValue([
    { id: 'original-credential-id' },
  ]);
  mock.tx.account.updateMany.mockResolvedValue({ count: 1 });
  mock.tx.session.deleteMany.mockResolvedValue({ count: 2 });
  // Only an in-memory adapter is used: no real user, .env or DB is touched.
  mock.transaction.mockImplementation(
    (operation: (tx: typeof mock.tx) => Promise<unknown>) => operation(mock.tx),
  );
});

it('requires deliberate local confirmation and preserves the password literally', () => {
  expect(validateLocalResetEnvironment(local, {}, ['--confirm-local'])).toEqual(
    input,
  );
  expect(() => validateLocalResetEnvironment(local, {}, [])).toThrow(
    AdminPasswordResetError,
  );
  expect(() =>
    validateLocalResetEnvironment(local, {}, ['--confirm-local', 'extra']),
  ).toThrow(AdminPasswordResetError);
});

it.each([
  { NODE_ENV: 'production' },
  { NODE_ENV: 'unknown' },
  { CI: 'true' },
  { VERCEL: '1' },
  { VERCEL_ENV: 'preview' },
  { AWS_LAMBDA_FUNCTION_NAME: 'hosted-function' },
  { K_SERVICE: 'hosted-service' },
])(
  'rejects hosted/production markers before auth or DB access: %j',
  (marker) => {
    for (const [file, runtime] of [
      [{ ...local, ...marker }, {}],
      [local, marker],
    ]) {
      expect(() =>
        validateLocalResetEnvironment(file, runtime, ['--confirm-local']),
      ).toThrow(AdminPasswordResetError);
    }
    expect(mock.transaction).not.toHaveBeenCalled();
  },
);

it.each([
  { DATABASE_URL: 'postgresql://test:unused@remote.example/local_bakery' },
  {
    DATABASE_URL:
      'postgresql://test:unused@localhost/local?host=remote.example',
  },
  { DATABASE_URL: 'postgresql://test:unused@localhost/' },
  { DATABASE_URL: 'mysql://localhost/local_bakery' },
  { DATABASE_URL: 'not-a-url' },
  { APP_URL: 'https://bakery.example' },
  { APP_URL: 'http://localhost:3000/path' },
  { BETTER_AUTH_URL: 'https://auth.example' },
  { ADMIN_EMAIL: 'invalid' },
  { ADMIN_PASSWORD: '' },
])('fails closed on unsafe/missing local file settings: %j', (change) => {
  expect(() =>
    validateLocalResetEnvironment({ ...local, ...change }, {}, [
      '--confirm-local',
    ]),
  ).toThrow(AdminPasswordResetError);
});

it('rejects inherited connection/origin overrides and accepts IPv6 loopback', () => {
  for (const key of ['DATABASE_URL', 'APP_URL', 'BETTER_AUTH_URL']) {
    expect(() =>
      validateLocalResetEnvironment(local, { [key]: 'different' }, [
        '--confirm-local',
      ]),
    ).toThrow(AdminPasswordResetError);
  }
  expect(
    validateLocalResetEnvironment(
      {
        ...local,
        DATABASE_URL: 'postgresql://test:unused@[::1]:5432/local_bakery',
        APP_URL: 'http://[::1]:3000',
      },
      {},
      ['--confirm-local'],
    ).email,
  ).toBe(input.email);
});

it('uses the configured Better Auth hash, updates only the existing credential and revokes all user sessions in one transaction', async () => {
  expect(await resetExistingAdminPassword(input)).toEqual({
    revokedSessions: 2,
  });
  const update = mock.tx.account.updateMany.mock.calls[0][0];
  expect(
    await verifyPassword({
      hash: update.data.password,
      password: input.password,
    }),
  ).toBe(true);
  expect(
    await verifyPassword({
      hash: update.data.password,
      password: 'Wrong-local-password',
    }),
  ).toBe(false);
  expect(Object.keys(update.data)).toEqual(['password']);
  expect(update.where).toEqual({
    id: 'original-credential-id',
    userId: 'original-admin-id',
    providerId: 'credential',
  });
  expect(mock.tx.account.findMany).toHaveBeenCalledWith({
    where: { userId: 'original-admin-id', providerId: 'credential' },
    select: { id: true },
  });
  expect(mock.tx.session.deleteMany).toHaveBeenCalledWith({
    where: { userId: 'original-admin-id' },
  });
  expect(mock.tx.$queryRaw.mock.calls[0][0].join('')).toMatch(/FOR UPDATE/);
  expect(mock.tx.$queryRaw.mock.calls[0][1]).toBe(input.email);
  expect(mock.transaction).toHaveBeenCalledWith(expect.any(Function), {
    maxWait: 5000,
    timeout: 10000,
  });
});

it.each([{ users: [] }, { users: [{ id: 'staff-id', role: 'STAFF' }] }])(
  'refuses missing or non-admin users without changing credentials/sessions',
  async ({ users }) => {
    mock.tx.$queryRaw.mockResolvedValue(users);
    await expect(resetExistingAdminPassword(input)).rejects.toBeInstanceOf(
      AdminPasswordResetError,
    );
    expect(mock.tx.account.findMany).not.toHaveBeenCalled();
    expect(mock.tx.account.updateMany).not.toHaveBeenCalled();
    expect(mock.tx.session.deleteMany).not.toHaveBeenCalled();
  },
);

it.each([{ accounts: [] }, { accounts: [{ id: 'first' }, { id: 'second' }] }])(
  'does not create or guess a missing/ambiguous credential account',
  async ({ accounts }) => {
    mock.tx.account.findMany.mockResolvedValue(accounts);
    await expect(resetExistingAdminPassword(input)).rejects.toBeInstanceOf(
      AdminPasswordResetError,
    );
    expect(mock.tx.account.updateMany).not.toHaveBeenCalled();
    expect(mock.tx.session.deleteMany).not.toHaveBeenCalled();
  },
);

it('aborts on a changed credential row and propagates revocation failure through the transaction', async () => {
  mock.tx.account.updateMany.mockResolvedValueOnce({ count: 0 });
  await expect(resetExistingAdminPassword(input)).rejects.toBeInstanceOf(
    AdminPasswordResetError,
  );
  expect(mock.tx.session.deleteMany).not.toHaveBeenCalled();
  const databaseFailure = new Error('sensitive-database-diagnostic');
  mock.tx.session.deleteMany.mockRejectedValueOnce(databaseFailure);
  await expect(resetExistingAdminPassword(input)).rejects.toBe(databaseFailure);
  // Prisma owns rollback of the rejected transaction; the error is never logged.
  expect(resetFailureMessage(databaseFailure)).not.toContain(
    databaseFailure.message,
  );
});

it.each(['too-short', 'x'.repeat(129)])(
  'uses configured password limits before hashing or mutations',
  async (password) => {
    await expect(
      resetExistingAdminPassword({ ...input, password }),
    ).rejects.toBeInstanceOf(AdminPasswordResetError);
    expect(mock.context.password.hash).not.toHaveBeenCalled();
    expect(mock.transaction).not.toHaveBeenCalled();
  },
);

it.each([
  { session: { cookieCache: { enabled: true } } },
  { secondaryStorage: {} },
])(
  'refuses session configurations that cannot be revoked by the DB transaction',
  async (options) => {
    mock.context.options = options;
    await expect(resetExistingAdminPassword(input)).rejects.toBeInstanceOf(
      AdminPasswordResetError,
    );
    expect(mock.transaction).not.toHaveBeenCalled();
  },
);

it('never includes unexpected error details, password or hash in CLI diagnostics', async () => {
  const hash = await hashPassword(input.password);
  const message = resetFailureMessage(new Error(`${input.password} ${hash}`));
  expect(message.includes(input.password) || message.includes(hash)).toBe(
    false,
  );
});

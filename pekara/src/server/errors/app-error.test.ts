import assert from 'node:assert/strict';
import { test } from 'vitest';

import { AppError } from './app-error.ts';
import {
  createAppErrorResponse,
  mapErrorToResponse,
} from './http-error-mapper.ts';
import { mapPrismaError } from './prisma-error-mapper.ts';
import { executeSafeAction, safeActionFailure } from './safe-action-result.ts';

test('AppError keeps its cause internal and serializes only safe fields', async () => {
  const cause = new Error('password=secret');
  const error = new AppError({
    code: 'CONFLICT',
    details: { field: 'slug' },
    cause,
  });
  assert.equal(error.cause, cause);
  const response = createAppErrorResponse(error, 'request-1');
  const body = await response.json();
  assert.equal(response.status, 409);
  assert.equal(response.headers.get('x-request-id'), 'request-1');
  assert.equal(JSON.stringify(body).includes('password=secret'), false);
  assert.deepEqual(body.error.details, { field: 'slug' });
});

test('known database errors map to stable safe application errors', () => {
  const unique = new Error('constraint users_email_key', {
    cause: { code: '23505' },
  });
  const unavailable = new Error('connection details', {
    cause: { code: '08006' },
  });
  assert.equal(mapPrismaError(unique)?.code, 'DUPLICATE_RESOURCE');
  assert.equal(mapPrismaError(unavailable)?.code, 'DATABASE_ERROR');
  assert.equal(mapPrismaError(new Error('ordinary')), null);
});

test('unknown HTTP and Server Action failures become INTERNAL_ERROR without leaks', async () => {
  const unknown = new Error('private infrastructure detail');
  const response = mapErrorToResponse(unknown, 'request-2');
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(
    JSON.stringify(body).includes('private infrastructure detail'),
    false,
  );
  const action = safeActionFailure(unknown);
  assert.equal(action.ok, false);
  if (!action.ok) assert.equal(action.error.code, 'INTERNAL_ERROR');
});

test('executeSafeAction returns a discriminated success or safe failure', async () => {
  assert.deepEqual(await executeSafeAction(async () => 42), {
    ok: true,
    data: 42,
  });
  const result = await executeSafeAction(async () => {
    throw new AppError({ code: 'VALIDATION_ERROR' });
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'VALIDATION_ERROR');
});

import 'server-only';

export type IdempotencyRecord<T> = {
  payloadHash: string;
  value: T;
};

type ExecuteIdempotentlyInput<T> = {
  idempotencyKey: string;
  payloadHash: string;
  findExisting: (
    idempotencyKey: string,
  ) => Promise<IdempotencyRecord<T> | null>;
  create: () => Promise<T>;
  isUniqueConflict: (error: unknown) => boolean;
};

export type IdempotencyResult<T> =
  { kind: 'created'; value: T } | { kind: 'existing'; value: T };

export class IdempotencyConflictError extends Error {
  readonly status = 409;

  constructor() {
    super('Idempotency key was already used with a different payload.');
    this.name = 'IdempotencyConflictError';
  }
}

function resolveExisting<T>(
  existing: IdempotencyRecord<T>,
  payloadHash: string,
): IdempotencyResult<T> {
  if (existing.payloadHash !== payloadHash) {
    throw new IdempotencyConflictError();
  }

  return { kind: 'existing', value: existing.value };
}

export async function executeIdempotently<T>({
  idempotencyKey,
  payloadHash,
  findExisting,
  create,
  isUniqueConflict,
}: ExecuteIdempotentlyInput<T>): Promise<IdempotencyResult<T>> {
  const existing = await findExisting(idempotencyKey);

  if (existing) {
    return resolveExisting(existing, payloadHash);
  }

  try {
    return { kind: 'created', value: await create() };
  } catch (error) {
    if (!isUniqueConflict(error)) {
      throw error;
    }

    const racedOrder = await findExisting(idempotencyKey);

    if (!racedOrder) {
      throw error;
    }

    return resolveExisting(racedOrder, payloadHash);
  }
}

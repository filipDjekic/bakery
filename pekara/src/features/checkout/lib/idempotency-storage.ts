const STORAGE_KEY = 'bakery:checkout-idempotency';
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type RecordValue = { signature: string; idempotencyKey: string };

function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Memory survives retries in this mounted checkout. Cross-refresh protection
 * requires working sessionStorage; no such guarantee is made when it is blocked. */
export function createCheckoutIdempotency(getStorage = browserStorage) {
  let memory: RecordValue | undefined;
  const records = new Map<string, string>();
  function safely<T>(operation: (storage: StorageLike) => T): T | undefined {
    try {
      const storage = getStorage();
      return storage ? operation(storage) : undefined;
    } catch {
      return undefined;
    }
  }
  return {
    keyFor(signature: string): string {
      if (records.has(signature)) {
        memory = { signature, idempotencyKey: records.get(signature)! };
        return memory.idempotencyKey;
      }
      if (memory?.signature === signature) return memory.idempotencyKey;
      const raw = safely((storage) => storage.getItem(STORAGE_KEY));
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        const values = Array.isArray(parsed?.records)
          ? parsed.records
          : [parsed];
        for (const row of values) {
          if (
            typeof row?.signature === 'string' &&
            typeof row?.idempotencyKey === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              row.idempotencyKey,
            )
          )
            records.set(row.signature, row.idempotencyKey);
        }
        const stored: unknown = records.has(signature)
          ? { signature, idempotencyKey: records.get(signature) }
          : null;
        if (
          stored &&
          typeof stored === 'object' &&
          'signature' in stored &&
          stored.signature === signature &&
          'idempotencyKey' in stored &&
          typeof stored.idempotencyKey === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            stored.idempotencyKey,
          )
        ) {
          memory = { signature, idempotencyKey: stored.idempotencyKey };
          return memory.idempotencyKey;
        }
      } catch {
        /* Malformed data is replaced on the next successful write. */
      }
      memory = { signature, idempotencyKey: crypto.randomUUID() };
      records.set(signature, memory.idempotencyKey);
      safely((storage) =>
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            records: [...records].map(([signature, idempotencyKey]) => ({
              signature,
              idempotencyKey,
            })),
          }),
        ),
      );
      return memory.idempotencyKey;
    },
    complete(completedKey = memory?.idempotencyKey) {
      safely((storage) => {
        const raw = storage.getItem(STORAGE_KEY);
        let parsed;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          /* Invalid records are replaced. */
        }
        const stored = Array.isArray(parsed?.records)
          ? parsed.records
          : parsed
            ? [parsed]
            : [];
        const remaining = stored.filter(
          (row: RecordValue) => row?.idempotencyKey !== completedKey,
        );
        if (remaining.length)
          storage.setItem(STORAGE_KEY, JSON.stringify({ records: remaining }));
        else storage.removeItem(STORAGE_KEY);
      });
      // Keep memory until unmount: a failed navigation retry must not create a duplicate.
    },
  };
}

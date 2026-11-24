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
      if (memory?.signature === signature) return memory.idempotencyKey;
      const raw = safely((storage) => storage.getItem(STORAGE_KEY));
      try {
        const stored: unknown = raw ? JSON.parse(raw) : null;
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
      safely((storage) => storage.setItem(STORAGE_KEY, JSON.stringify(memory)));
      return memory.idempotencyKey;
    },
    complete() {
      safely((storage) => storage.removeItem(STORAGE_KEY));
      // Keep memory until unmount: a failed navigation retry must not create a duplicate.
    },
  };
}

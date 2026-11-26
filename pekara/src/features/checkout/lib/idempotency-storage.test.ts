import { describe, expect, it } from 'vitest';
import { createCheckoutIdempotency } from './idempotency-storage';

describe('checkout idempotency storage', () => {
  it('retains the key across retries and completion when storage throws', () => {
    const storage = createCheckoutIdempotency(() => {
      throw new Error('Blocked');
    });
    const key = storage.keyFor('draft');
    expect(storage.keyFor('draft')).toBe(key);
    expect(() => storage.complete()).not.toThrow();
    expect(storage.keyFor('draft')).toBe(key);
    expect(storage.keyFor('changed draft')).not.toBe(key);
  });
  it('restores a persisted key after refresh and replaces malformed data', () => {
    let raw = '{broken';
    const getStorage = () => ({
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
      removeItem: () => {
        throw new Error('Quota');
      },
    });
    const first = createCheckoutIdempotency(getStorage);
    const key = first.keyFor('draft');
    expect(createCheckoutIdempotency(getStorage).keyFor('draft')).toBe(key);
    expect(() => first.complete()).not.toThrow();
  });
  it('works when reads and writes each fail', () => {
    const broken = () => {
      throw new Error('Unavailable');
    };
    const storage = createCheckoutIdempotency(() => ({
      getItem: broken,
      setItem: broken,
      removeItem: broken,
    }));
    expect(storage.keyFor('draft')).toBe(storage.keyFor('draft'));
  });
  it('retains ambiguous drafts when the customer edits and then restores a draft, including refresh', () => {
    let raw = '';
    const storage = () => ({
      getItem: () => raw,
      setItem: (_: string, value: string) => {
        raw = value;
      },
      removeItem: () => {
        raw = '';
      },
    });
    const first = createCheckoutIdempotency(storage);
    const key = first.keyFor('A');
    expect(first.keyFor('B')).not.toBe(key);
    expect(first.keyFor('A')).toBe(key);
    expect(createCheckoutIdempotency(storage).keyFor('A')).toBe(key);
    first.complete();
    expect(createCheckoutIdempotency(storage).keyFor('A')).not.toBe(key);
  });
});

import { describe, expect, it } from 'vitest';

import { requestIdFor } from './request-id';

describe('requestIdFor', () => {
  it('keeps a valid upstream request ID', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-request-id': 'edge:req-123' },
    });
    expect(requestIdFor(request)).toBe('edge:req-123');
  });

  it('replaces unsafe values', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-request-id': 'unsafe value\n' },
    });
    expect(requestIdFor(request)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

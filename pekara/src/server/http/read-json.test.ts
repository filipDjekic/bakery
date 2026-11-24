import { describe, expect, it } from 'vitest';
import { readBoundedJson } from './read-json';

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}
describe('bounded JSON', () => {
  it('parses valid UTF-8 JSON', async () => {
    await expect(
      readBoundedJson(request('{"name":"Željko"}')),
    ).resolves.toEqual({ name: 'Željko' });
  });
  it('rejects malformed JSON and wrong media types', async () => {
    await expect(readBoundedJson(request('{'))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    await expect(
      readBoundedJson(request('{}', { 'content-type': 'text/plain' })),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });
  it('counts actual bytes when Content-Length is absent or false', async () => {
    await expect(
      readBoundedJson(request('"' + 'ž'.repeat(10) + '"'), 16),
    ).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    await expect(
      readBoundedJson(
        request('"' + 'a'.repeat(50) + '"', { 'content-length': '1' }),
        16,
      ),
    ).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });
});

import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

export function requestIdFor(request: Request): string {
  const supplied = request.headers.get('x-request-id');
  return supplied && REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : randomUUID();
}

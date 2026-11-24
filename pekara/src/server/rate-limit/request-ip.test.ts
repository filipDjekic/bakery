import { expect, it } from 'vitest';
import { requestClientIp } from './request-ip';

it('ignores injected headers in local development', () => {
  expect(
    requestClientIp(new Headers({ 'x-forwarded-for': '8.8.8.8' }), {
      NODE_ENV: 'development',
      APP_URL: 'http://localhost:3000',
    }),
  ).toBe('127.0.0.1');
});
it('fails closed without an explicitly trusted production ingress', () => {
  expect(() =>
    requestClientIp(new Headers({ 'x-forwarded-for': '8.8.8.8' }), {
      NODE_ENV: 'production',
      APP_URL: 'https://bakery.example',
    }),
  ).toThrow();
});
it('selects from the trusted right side of a proxy chain', () => {
  expect(
    requestClientIp(
      new Headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.2, 10.0.0.1' }),
      {
        NODE_ENV: 'production',
        APP_URL: 'https://bakery.example',
        TRUSTED_PROXY_MODE: 'proxy',
        TRUSTED_PROXY_HOPS: '2',
      },
    ),
  ).toBe('203.0.113.2');
});
it('handles Vercel IPv6 and rejects missing or chained headers', () => {
  const env = {
    NODE_ENV: 'production' as const,
    APP_URL: 'https://bakery.example',
    VERCEL: '1',
  };
  expect(requestClientIp(new Headers({ 'x-forwarded-for': '::1' }), env)).toBe(
    '::1',
  );
  expect(() => requestClientIp(new Headers(), env)).toThrow();
  expect(() =>
    requestClientIp(
      new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }),
      env,
    ),
  ).toThrow();
});

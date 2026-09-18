import { describe, expect, it } from 'vitest';
import type { DestinationStream } from 'pino';

import { createServerLogger, safeInfo } from './logger';

describe('server logger', () => {
  it('emits structured JSON and redacts sensitive fields', () => {
    let output = '';
    const destination: DestinationStream = {
      write(chunk) {
        output += chunk;
      },
    };
    const logger = createServerLogger(destination);

    logger.info({
      requestId: 'req-1',
      event: 'order.create.succeeded',
      route: '/api/orders',
      orderId: 'order-1',
      password: 'secret-password',
      cookie: 'session=secret-cookie',
      authorization: 'Bearer secret-token',
      rawIp: '203.0.113.10',
      customerPhone: '+381641234567',
      customerNote: 'private note',
    });

    const record = JSON.parse(output) as Record<string, unknown>;
    expect(record.requestId).toBe('req-1');
    expect(record.event).toBe('order.create.succeeded');
    expect(record.password).toBe('[Redacted]');
    expect(record.cookie).toBe('[Redacted]');
    expect(record.authorization).toBe('[Redacted]');
    expect(record.rawIp).toBe('[Redacted]');
    expect(record.customerPhone).toBe('[Redacted]');
    expect(record.customerNote).toBe('[Redacted]');
    expect(output).not.toContain('secret-password');
    expect(output).not.toContain('203.0.113.10');
  });

  it('does not propagate logger failures', () => {
    expect(() =>
      safeInfo(
        { requestId: 'req-1', event: 'test', route: '/test' },
        {
          info() {
            throw new Error('destination unavailable');
          },
          error() {},
        },
      ),
    ).not.toThrow();
  });
});

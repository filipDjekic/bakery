import type { ErrorEvent } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';

import { scrubSentryEvent } from './sentry';

describe('scrubSentryEvent', () => {
  it('removes PII, credentials, cookies and raw IP headers', () => {
    const event: ErrorEvent = {
      type: undefined,
      user: {
        id: 'staff-1',
        email: 'staff@example.test',
        username: 'Staff Name',
        ip_address: '203.0.113.10',
      },
      request: {
        cookies: { session: 'secret' },
        data: { customerPhone: '+381641234567' },
        query_string: 'email=customer@example.test',
        headers: {
          Authorization: 'Bearer secret',
          Cookie: 'session=secret',
          'X-Forwarded-For': '203.0.113.10',
          Accept: 'application/json',
        },
      },
    };

    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed.user).toEqual({ id: 'staff-1' });
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.query_string).toBeUndefined();
    expect(scrubbed.request?.headers).toEqual({ Accept: 'application/json' });
  });
});

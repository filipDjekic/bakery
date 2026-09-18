import { describe, expect, it, vi } from 'vitest';

import { AppError } from './app-error';
import { reportUnexpectedError } from './sentry';

describe('reportUnexpectedError', () => {
  it('captures a controlled unexpected exception with correlation tags', () => {
    const capture = vi.fn();
    const error = new Error('controlled Sentry test error');

    reportUnexpectedError(
      error,
      {
        requestId: 'req-1',
        event: 'test.error',
        route: '/test',
        orderId: 'order-1',
      },
      capture,
    );

    expect(capture).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: {
          requestId: 'req-1',
          event: 'test.error',
          route: '/test',
        },
      }),
    );
  });

  it('does not report expected domain errors or propagate SDK failures', () => {
    const capture = vi.fn(() => {
      throw new Error('Sentry unavailable');
    });

    reportUnexpectedError(
      new AppError({ code: 'VALIDATION_ERROR' }),
      { event: 'test.error', route: '/test' },
      capture,
    );
    expect(capture).not.toHaveBeenCalled();

    reportUnexpectedError(
      Object.assign(new Error('rate limited'), { status: 429 }),
      { event: 'test.error', route: '/test' },
      capture,
    );
    expect(capture).not.toHaveBeenCalled();

    expect(() =>
      reportUnexpectedError(
        new Error('unexpected'),
        { event: 'test.error', route: '/test' },
        capture,
      ),
    ).not.toThrow();
  });
});

import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EmailConfigurationError } from './email-service';
import { createResendEmailService } from './resend-client';

describe('createResendEmailService', () => {
  it('maps a transactional message to Resend', async () => {
    const send = vi.fn().mockResolvedValue({
      data: { id: 'delivery-1' },
      error: null,
    });
    const service = createResendEmailService({
      apiKey: 're_test_key',
      from: 'Pekara <orders@example.test>',
      client: { send } as never,
    });
    const react = createElement('p', null, 'Test');

    await expect(
      service.send({
        to: 'customer@example.test',
        subject: 'Potvrda',
        react,
      }),
    ).resolves.toEqual({ id: 'delivery-1' });
    expect(send).toHaveBeenCalledWith({
      from: 'Pekara <orders@example.test>',
      to: ['customer@example.test'],
      subject: 'Potvrda',
      react,
    });
  });

  it('rejects missing configuration and provider errors', async () => {
    expect(() =>
      createResendEmailService({ apiKey: ' ', from: 'sender@example.test' }),
    ).toThrow(EmailConfigurationError);

    const service = createResendEmailService({
      apiKey: 're_test_key',
      from: 'sender@example.test',
      client: {
        send: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'no' } }),
      } as never,
    });
    await expect(
      service.send({
        to: 'customer@example.test',
        subject: 'Test',
        react: createElement('p'),
      }),
    ).rejects.toThrow('provider rejected');
  });
});

it('passes provider idempotency and an abortable five-second HTTP signal through the real SDK', async () => {
  const controller = new AbortController();
  const started = Promise.withResolvers<void>();
  const timeout = vi
    .spyOn(AbortSignal, 'timeout')
    .mockReturnValue(controller.signal);
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (_url, options) => {
      expect(options?.signal).toBe(controller.signal);
      started.resolve();
      return new Promise<Response>((_resolve, reject) => {
        controller.signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      });
    });
  try {
    const service = createResendEmailService({
      apiKey: 're_test_only',
      from: 'sender@example.test',
    });
    const result = service.send({
      to: 'customer@example.test',
      subject: 'Test',
      react: createElement('p', null, 'Test'),
      idempotencyKey: 'order/test/customer/v1',
    });
    const failure = result.then(
      () => null,
      (error) => error as unknown,
    );
    await started.promise;
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(
      new Headers(fetch.mock.calls[0]?.[1]?.headers).get('Idempotency-Key'),
    ).toBe('order/test/customer/v1');
    controller.abort();
    expect(await failure).toMatchObject({
      message: 'Transactional email provider rejected the request.',
    });
  } finally {
    controller.abort();
    vi.restoreAllMocks();
  }
});

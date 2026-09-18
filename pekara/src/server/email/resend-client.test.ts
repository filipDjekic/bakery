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

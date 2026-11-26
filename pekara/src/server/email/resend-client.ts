import 'server-only';

import { Resend } from 'resend';

import { EmailConfigurationError, type EmailService } from './email-service.ts';

type ResendEmailClient = Pick<Resend['emails'], 'send'>;

class BoundedResend extends Resend {
  override fetchRequest<T>(path: string, options: object = {}) {
    return super.fetchRequest<T>(path, {
      ...options,
      signal: AbortSignal.timeout(5_000),
    });
  }
}

type ResendEmailOptions = {
  apiKey?: string;
  from?: string;
  client?: ResendEmailClient;
};

function requiredTrimmed(value: string | undefined, name: string): string {
  if (!value || value !== value.trim()) {
    throw new EmailConfigurationError(`${name} is not configured correctly.`);
  }
  return value;
}

export function createResendEmailService(
  options: ResendEmailOptions = {},
): EmailService {
  const apiKey = requiredTrimmed(
    options.apiKey ?? process.env.RESEND_API_KEY,
    'RESEND_API_KEY',
  );
  const from = requiredTrimmed(
    options.from ?? process.env.EMAIL_FROM,
    'EMAIL_FROM',
  );
  const client = options.client ?? new BoundedResend(apiKey).emails;

  return {
    async send(message) {
      const payload = {
        from: message.from ?? from,
        to: [message.to],
        subject: message.subject,
        ...(message.html ? { html: message.html } : { react: message.react }),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      };
      const { data, error } = message.idempotencyKey
        ? await client.send(payload, { idempotencyKey: message.idempotencyKey })
        : await client.send(payload);

      if (error || !data?.id) {
        throw new Error('Transactional email provider rejected the request.');
      }

      return { id: data.id };
    },
  };
}

let defaultEmailService: EmailService | undefined;

export function getEmailService(): EmailService {
  defaultEmailService ??= createResendEmailService();
  return defaultEmailService;
}

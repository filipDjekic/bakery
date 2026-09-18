import 'server-only';

import { Resend } from 'resend';

import { EmailConfigurationError, type EmailService } from './email-service.ts';

type ResendEmailClient = Pick<Resend['emails'], 'send'>;

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
  const client = options.client ?? new Resend(apiKey).emails;

  return {
    async send(message) {
      const { data, error } = await client.send({
        from,
        to: [message.to],
        subject: message.subject,
        react: message.react,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });

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

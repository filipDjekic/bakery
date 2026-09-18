import 'server-only';

import type { ReactElement } from 'react';

export type TransactionalEmail = {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
};

export type EmailDelivery = {
  id: string;
};

export interface EmailService {
  send(message: TransactionalEmail): Promise<EmailDelivery>;
}

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailConfigurationError';
  }
}

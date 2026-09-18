import 'server-only';

import pino, { type DestinationStream, type Logger } from 'pino';

const REDACTED = '[Redacted]';

export function createServerLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      base: undefined,
      redact: {
        paths: [
          'password',
          'cookie',
          'authorization',
          'token',
          'ip',
          'rawIp',
          'customerPhone',
          'customerEmail',
          'customerNote',
          'req.headers.cookie',
          'req.headers.authorization',
          'req.headers.x-forwarded-for',
          'req.headers.x-real-ip',
        ],
        censor: REDACTED,
      },
    },
    destination,
  );
}

export const serverLogger = createServerLogger();

export type EventLogger = Pick<Logger, 'info' | 'error'>;

export function safeInfo(
  fields: Record<string, unknown>,
  logger: EventLogger = serverLogger,
): void {
  try {
    logger.info(fields);
  } catch {
    // Observability must never interrupt a business operation.
  }
}

export function safeError(
  fields: Record<string, unknown>,
  logger: EventLogger = serverLogger,
): void {
  try {
    logger.error(fields);
  } catch {
    // Observability must never interrupt a business operation.
  }
}

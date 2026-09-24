import type { AppErrorCode } from './error-codes.ts';
import { DEFAULT_ERROR_DEFINITIONS } from './error-codes.ts';

export type SafeErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly safeMessage: string;
  readonly status: number;
  readonly details?: SafeErrorDetails;

  constructor(options: {
    code: AppErrorCode;
    safeMessage?: string;
    status?: number;
    details?: SafeErrorDetails;
    cause?: unknown;
  }) {
    const definition = DEFAULT_ERROR_DEFINITIONS[options.code];
    super(options.safeMessage ?? definition.safeMessage, {
      cause: options.cause,
    });
    this.name = 'AppError';
    this.code = options.code;
    this.safeMessage = options.safeMessage ?? definition.safeMessage;
    this.status = options.status ?? definition.status;
    this.details = options.details;
  }
}

export function internalError(cause?: unknown): AppError {
  return new AppError({ code: 'INTERNAL_ERROR', cause });
}

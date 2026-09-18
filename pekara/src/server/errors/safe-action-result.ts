import { AppError, internalError, type SafeErrorDetails } from './app-error.ts';
import type { AppErrorCode } from './error-codes.ts';
import { mapPrismaError } from './prisma-error-mapper.ts';

export type SafeActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: AppErrorCode;
        message: string;
        details?: SafeErrorDetails;
      };
    };

export function safeActionSuccess<T>(data: T): SafeActionResult<T> {
  return { ok: true, data };
}

export function normalizeAppError(
  error: unknown,
  domainMapper?: (error: unknown) => AppError | null,
): AppError {
  if (error instanceof AppError) return error;
  return domainMapper?.(error) ?? mapPrismaError(error) ?? internalError(error);
}

export function safeActionFailure(
  error: unknown,
  domainMapper?: (error: unknown) => AppError | null,
): SafeActionResult<never> {
  const normalized = normalizeAppError(error, domainMapper);
  return {
    ok: false,
    error: {
      code: normalized.code,
      message: normalized.safeMessage,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
  };
}

export async function executeSafeAction<T>(
  operation: () => Promise<T>,
  domainMapper?: (error: unknown) => AppError | null,
): Promise<SafeActionResult<T>> {
  try {
    return safeActionSuccess(await operation());
  } catch (error) {
    return safeActionFailure(error, domainMapper);
  }
}

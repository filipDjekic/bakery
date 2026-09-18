import { AppError } from './app-error.ts';

function databaseCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const direct = error as Error & { code?: unknown };
  const cause = error.cause as { code?: unknown } | undefined;
  const code = cause?.code ?? direct.code;
  return typeof code === 'string' ? code : undefined;
}

export function mapPrismaError(error: unknown): AppError | null {
  const code = databaseCode(error);
  if (!code) return null;
  if (code === '23505' || code === 'P2002')
    return new AppError({ code: 'DUPLICATE_RESOURCE', cause: error });
  if (
    code === '23503' ||
    code === 'P2003' ||
    code === '40001' ||
    code === '40P01'
  )
    return new AppError({ code: 'CONFLICT', cause: error });
  if (code === '23502' || code === '22P02' || code === 'P2000')
    return new AppError({ code: 'VALIDATION_ERROR', cause: error });
  if (
    code.startsWith('08') ||
    code === '57P01' ||
    code === 'P1001' ||
    code === 'P1002'
  )
    return new AppError({ code: 'DATABASE_ERROR', cause: error });
  return null;
}

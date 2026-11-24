import type { ZodIssue } from 'zod';
export function fieldErrors(
  issues: readonly ZodIssue[] | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues ?? []) {
    const field = String(issue.path[0] ?? 'form');
    result[field] ??= issue.message;
  }
  return result;
}

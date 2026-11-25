import { z } from 'zod';
export type SearchParams = Record<string, string | string[] | undefined>;
export const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
export const pageNumber = (value: unknown) =>
  z.coerce.number().int().min(1).max(100_000).catch(1).parse(value);
export const searchText = (value: unknown) =>
  z.string().trim().max(120).catch('').parse(value);
export const containsPattern = (value: string) =>
  `%${value.replace(/[\\%_]/g, '\\$&')}%`;
export function paginationFor(
  totalItems: number,
  requestedPage: unknown,
  pageSize = 25,
) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    page: Math.min(pageNumber(requestedPage), totalPages),
    pageSize,
    totalItems,
    totalPages,
  };
}
export function listFilters(params: SearchParams) {
  return {
    q: searchText(firstParam(params.q)),
    active: ['true', 'false'].includes(firstParam(params.active) ?? '')
      ? firstParam(params.active)
      : undefined,
    available: ['true', 'false'].includes(firstParam(params.available) ?? '')
      ? firstParam(params.available)
      : undefined,
    category: z
      .string()
      .uuid()
      .optional()
      .catch(undefined)
      .parse(firstParam(params.category)),
  };
}

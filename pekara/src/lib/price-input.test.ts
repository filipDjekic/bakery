import { expect, it } from 'vitest';
import { parseRsdInput, formatRsdInput } from './price-input';
it('parses exact Serbian and decimal prices without floating point rounding', () => {
  for (const [value, minor] of [
    ['150', 15000],
    ['150,50', 15050],
    ['0.29', 29],
    ['0', 0],
  ] as const)
    expect(parseRsdInput(value)).toBe(minor);
  for (const value of ['-1', '1.234', '1e3', '', '1,000.50'])
    expect(parseRsdInput(value)).toBeNull();
  expect(formatRsdInput(15050)).toBe('150,50');
});

it('honors int32 product boundaries through form validation', async () => {
  const { productValuesFromFormData } =
    await import('../features/admin-products/actions/product-form-values');
  const { productMutationSchema } = await import('../validation/product');
  const data = new FormData();
  for (const [key, value] of Object.entries({
    name: 'Test',
    slug: 'test',
    description: 'Opis',
    categoryId: '11111111-1111-4111-8111-111111111111',
    sortOrder: '0',
    priceRsd: '21474836,47',
  }))
    data.set(key, value);
  expect(
    productMutationSchema.parse(productValuesFromFormData(data)).priceMinor,
  ).toBe(2147483647);
  for (const price of ['21474836,48', '', '-1', '180,501']) {
    data.set('priceRsd', price);
    expect(
      productMutationSchema.safeParse(productValuesFromFormData(data)).success,
    ).toBe(false);
  }
});

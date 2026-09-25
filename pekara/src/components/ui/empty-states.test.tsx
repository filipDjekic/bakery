// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductsTable } from '@/features/admin-products/components/products-table';
import { CategoriesTable } from '@/features/categories/components/categories-table';

describe('actionable administrative empty states', () => {
  it('offers the first product action', () => {
    render(<ProductsTable products={[]} />);
    expect(
      screen.getByRole('heading', { name: 'Još nema proizvoda' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Dodaj prvi proizvod' }),
    ).toHaveAttribute('href', '/admin/products/new');
  });

  it('offers the first category action', () => {
    render(<CategoriesTable categories={[]} />);
    expect(
      screen.getByRole('heading', { name: 'Još nema kategorija' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Dodaj prvu kategoriju' }),
    ).toHaveAttribute('href', '/admin/categories/new');
  });
});

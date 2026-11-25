// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductsTable } from '@/features/admin-products/components/products-table';
import { CategoriesTable } from '@/features/categories/components/categories-table';

describe('actionable administrative empty states', () => {
  it('offers the first product action', () => {
    render(<ProductsTable products={[]} />);
    expect(
      screen.getByRole('heading', {
        name: 'Nema proizvoda za izabrane filtere',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Dodaj proizvod' }),
    ).toHaveAttribute('href', '/admin/products/new');
  });

  it('offers the first category action', () => {
    render(<CategoriesTable categories={[]} />);
    expect(
      screen.getByRole('heading', {
        name: 'Nema kategorija za izabrane filtere',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Dodaj kategoriju' }),
    ).toHaveAttribute('href', '/admin/categories/new');
  });
});

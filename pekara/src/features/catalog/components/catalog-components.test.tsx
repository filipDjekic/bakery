// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { CART_LIMITS } from '@/config/limits';
import { useCartStore } from '@/features/cart/store/cart-store';
import type { CatalogProduct } from '@/server/queries/catalog';

import {
  CatalogBrowser,
  filterAndSortCatalogProducts,
} from './catalog-browser';
import { CategoryFilter } from './category-filter';
import { CompactCartControl } from './compact-cart-control';

const product: CatalogProduct = {
  id: 'product-1',
  name: 'Puterasiti kroasan',
  slug: 'puterasti-kroasan',
  description: 'Hrskav spolja i mekan iznutra.',
  priceMinor: 18000,
  imageUrl: null,
  imageWidth: null,
  imageHeight: null,
  isAvailable: true,
};

const item = {
  productId: product.id,
  name: product.name,
  imageUrl: product.imageUrl,
  displayPriceMinor: product.priceMinor,
};

beforeEach(async () => {
  window.localStorage.clear();
  useCartStore.getState().clear();
  await useCartStore.persist.rehydrate();
});

describe('compact catalog interactions', () => {
  it('adds a product and then exposes minus, quantity and plus controls', async () => {
    const user = userEvent.setup();
    render(<CompactCartControl item={item} isAvailable />);

    await user.click(
      screen.getByRole('button', { name: `Dodaj ${item.name} u korpu` }),
    );

    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
    expect(
      screen.getByRole('button', {
        name: `Smanji količinu proizvoda ${item.name}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(`Količina proizvoda ${item.name}`),
    ).toHaveTextContent('1');
    expect(
      screen.getByRole('button', {
        name: `Povećaj količinu proizvoda ${item.name}`,
      }),
    ).toBeInTheDocument();
  });

  it('removes the product when minus is used at quantity one', async () => {
    useCartStore.getState().addItem(item);
    const user = userEvent.setup();
    render(<CompactCartControl item={item} isAvailable />);

    await user.click(
      screen.getByRole('button', {
        name: `Smanji količinu proizvoda ${item.name}`,
      }),
    );
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('disables increment at the existing per-item cart limit', () => {
    useCartStore.getState().addItem(item, CART_LIMITS.maxItemQuantity);
    render(<CompactCartControl item={item} isAvailable />);

    expect(
      screen.getByRole('button', {
        name: `Povećaj količinu proizvoda ${item.name}`,
      }),
    ).toBeDisabled();
  });

  it('renders a textual sold-out state without an add action', () => {
    render(<CompactCartControl item={item} isAvailable={false} />);
    expect(screen.getByText('Rasprodato')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses slug-based category links and selected state', () => {
    render(
      <CategoryFilter
        categories={[{ id: 'category-1', name: 'Peciva', slug: 'peciva' }]}
        selectedCategorySlug="peciva"
      />,
    );
    const link = screen.getByRole('link', { name: 'Peciva' });
    expect(link).toHaveAttribute('href', '/proizvodi?category=peciva');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('renders URL-driven search state and an actionable empty state', () => {
    render(
      <CatalogBrowser
        products={[product]}
        categoryFilter={null}
        query="pizza"
        sort="default"
        selectedCategorySlug={null}
      />,
    );

    expect(
      screen.getByText('Nema proizvoda koji odgovaraju pretrazi „pizza“.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Obriši pretragu i sortiranje' }),
    ).toHaveAttribute('href', '/proizvodi');
  });

  it('filters and sorts catalog products on the server', () => {
    const second = {
      ...product,
      id: 'product-2',
      name: 'Burek',
      description: 'Sa sirom',
      priceMinor: 25000,
    };

    expect(
      filterAndSortCatalogProducts([product, second], 'sir', 'default').map(
        ({ id }) => id,
      ),
    ).toEqual(['product-2']);
    expect(
      filterAndSortCatalogProducts([product, second], '', 'price-desc').map(
        ({ id }) => id,
      ),
    ).toEqual(['product-2', 'product-1']);
  });

  it('keeps the product card cart control interactive', async () => {
    const user = userEvent.setup();
    render(
      <CatalogBrowser
        products={[product]}
        categoryFilter={null}
        query=""
        sort="default"
        selectedCategorySlug={null}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: `Dodaj ${item.name} u korpu` }),
    );
    expect(
      useCartStore
        .getState()
        .items.find(({ productId }) => productId === item.productId)?.quantity,
    ).toBe(1);
  });
});

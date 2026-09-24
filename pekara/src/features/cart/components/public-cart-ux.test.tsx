// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CART_LIMITS } from '@/config/limits';
import { ProductDetailCartControl } from '@/features/catalog/components/product-detail-cart-control';

import { openCartDrawer } from '../lib/cart-drawer-events';
import { useCartStore } from '../store/cart-store';
import { CartDrawer } from './cart-drawer';
import { CartTrigger } from './cart-trigger';
import { MobileCartBar } from './mobile-cart-bar';

let pathname = '/proizvodi';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const item = {
  productId: 'product-1',
  name: 'Kroasan',
  imageUrl: null,
  displayPriceMinor: 15000,
};

beforeEach(async () => {
  pathname = '/proizvodi';
  window.localStorage.clear();
  useCartStore.getState().clear();
  await useCartStore.persist.rehydrate();
});

describe('product detail quantity', () => {
  it('starts at one, respects minimum and adds the selected quantity', async () => {
    const user = userEvent.setup();
    render(<ProductDetailCartControl item={item} isAvailable />);
    const decrease = screen.getByRole('button', { name: /Smanji količinu/ });
    expect(screen.getByLabelText(/Izabrana količina/)).toHaveTextContent('1');
    expect(decrease).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Povećaj količinu/ }));
    await user.click(screen.getByRole('button', { name: /Povećaj količinu/ }));
    await user.click(screen.getByRole('button', { name: 'Dodaj u korpu' }));
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
  });

  it('disables addition for unavailable products and at the item limit', () => {
    const { rerender } = render(
      <ProductDetailCartControl item={item} isAvailable={false} />,
    );
    expect(
      screen.getByRole('button', { name: 'Nije dostupno' }),
    ).toBeDisabled();
    useCartStore.getState().addItem(item, CART_LIMITS.maxItemQuantity);
    rerender(<ProductDetailCartControl item={item} isAvailable />);
    expect(
      screen.getByRole('button', { name: 'Maksimalna količina je u korpi' }),
    ).toBeDisabled();
  });
});

describe('cart drawer', () => {
  it('opens from the header trigger, updates quantity and closes with Escape', async () => {
    useCartStore.getState().addItem(item);
    const user = userEvent.setup();
    render(
      <>
        <CartTrigger />
        <CartDrawer />
      </>,
    );
    const trigger = screen.getByRole('button', { name: /Otvori korpu/ });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Korpa' })).toBeInTheDocument();
    expect(screen.getByText('Kroasan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Povećaj količinu/ }));
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
    expect(screen.getAllByText('300,00 RSD')).toHaveLength(2);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('supports remove, empty state and close button', async () => {
    useCartStore.getState().addItem(item);
    const user = userEvent.setup();
    render(<CartDrawer />);
    openCartDrawer();
    await screen.findByRole('dialog');
    await user.click(screen.getByText('Ukloni', { selector: 'button' }));
    expect(screen.getByText('Korpa je prazna.')).toBeInTheDocument();
    await user.click(
      screen.getAllByRole('button', { name: 'Zatvori korpu' }).at(-1)!,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('mobile cart bar', () => {
  it('is hidden for an empty cart and shows live count and total otherwise', async () => {
    const { rerender } = render(<MobileCartBar />);
    expect(
      screen.queryByRole('button', { name: /Korpa/ }),
    ).not.toBeInTheDocument();
    useCartStore.getState().addItem(item, 2);
    rerender(<MobileCartBar />);
    expect(screen.getByRole('button', { name: /Korpa/ })).toHaveTextContent(
      'Korpa · 2',
    );
    expect(screen.getByRole('button', { name: /Korpa/ })).toHaveTextContent(
      '300,00 RSD',
    );
  });

  it('opens the same cart drawer', async () => {
    useCartStore.getState().addItem(item);
    const user = userEvent.setup();
    render(
      <>
        <MobileCartBar />
        <CartDrawer />
      </>,
    );
    await user.click(screen.getByRole('button', { name: /Korpa/ }));
    expect(screen.getByRole('dialog', { name: 'Korpa' })).toBeInTheDocument();
  });

  it.each(['/korpa', '/checkout', '/porudzbina/order-1', '/admin'])(
    'is hidden on %s',
    (route) => {
      pathname = route;
      useCartStore.getState().addItem(item);
      render(<MobileCartBar />);
      expect(
        screen.queryByRole('button', { name: /Korpa/ }),
      ).not.toBeInTheDocument();
    },
  );
});

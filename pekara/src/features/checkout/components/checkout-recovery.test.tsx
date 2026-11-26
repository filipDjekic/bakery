// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useCartStore } from '@/features/cart/store/cart-store';
import { CheckoutForm } from './checkout-form';
import {
  CreateOrderApiError,
  createOrderRequest,
  createDraftSignature,
} from '../api/create-order';
import type { PickupAvailability } from '@/server/services/pickup-slots';
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  key: vi.fn(() => '11111111-1111-4111-8111-111111111111'),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/features/cart/hooks/use-cart-hydration', () => ({
  useCartHydration: () => true,
}));
vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('../api/create-order', async (original) => ({
  ...(await original<typeof import('../api/create-order')>()),
  createOrderRequest: vi.fn(),
  createDraftSignature: vi.fn(),
}));
vi.mock('../lib/idempotency-storage', () => ({
  createCheckoutIdempotency: () => ({ keyFor: mocks.key, complete: vi.fn() }),
}));
const product = {
  productId: '22222222-2222-4222-8222-222222222222',
  name: 'Hleb',
  imageUrl: null,
  displayPriceMinor: 100,
};
const slot = { label: '10:00', value: '2026-11-27T09:00:00.000Z' };
const availability: PickupAvailability = {
  dates: [{ date: '2026-11-27', label: 'Sutra', shortDateLabel: '27. nov' }],
  earliestSlot: { ...slot, date: '2026-11-27', dateLabel: 'Sutra' },
  bakeryTimezone: 'Europe/Belgrade',
  orderAcceptingEnabled: true,
};
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  useCartStore.getState().clear();
  useCartStore.getState().addItem(product);
  vi.mocked(createDraftSignature).mockResolvedValue('signature');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    json(
      String(url).includes('pickup-availability')
        ? availability
        : { slots: [slot], bakeryTimezone: 'Europe/Belgrade' },
    ),
  );
});
afterEach(() => vi.restoreAllMocks());
async function fill() {
  const user = userEvent.setup();
  render(<CheckoutForm pickupAvailability={availability} />);
  await user.type(screen.getByLabelText('Ime i prezime'), 'Petar Petrović');
  await user.type(screen.getByLabelText('Telefon'), '064 123 4567');
  await user.click(screen.getByRole('button', { name: /Sutra/ }));
  await user.click(await screen.findByRole('button', { name: '10:00' }));
  return user;
}
const submit = () => screen.getByRole('button', { name: /Pošalji porudžbinu/ });
it('clears rejected selection, refreshes dates and slots and preserves contact and cart', async () => {
  vi.mocked(createOrderRequest).mockRejectedValue(
    new CreateOrderApiError('INVALID_PICKUP_SLOT', 'Expired'),
  );
  const user = await fill();
  await user.click(submit());
  await screen.findByRole('alert');
  expect(submit()).toBeDisabled();
  expect(screen.getByLabelText('Ime i prezime')).toHaveValue('Petar Petrović');
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(screen.getByRole('button', { name: '10:00' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
it('refreshes an invalid date and prevents repeated expired-slot submissions', async () => {
  vi.mocked(createOrderRequest).mockRejectedValue(
    new CreateOrderApiError('INVALID_PICKUP_SLOT', 'Expired'),
  );
  const user = await fill();
  vi.mocked(fetch).mockImplementation(async (url) =>
    json(
      String(url).includes('pickup-availability')
        ? { ...availability, dates: [], earliestSlot: null }
        : { slots: [], bakeryTimezone: 'Europe/Belgrade' },
    ),
  );
  await user.click(submit());
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: /Sutra/ }),
  ).not.toBeInTheDocument();
  expect(submit()).toBeDisabled();
  await user.click(submit());
  expect(createOrderRequest).toHaveBeenCalledTimes(1);
});
it.each(['signature', 'key'])(
  'handles %s generation failure in the checkout error flow',
  async (kind) => {
    const user = await fill();
    if (kind === 'signature')
      vi.mocked(createDraftSignature).mockRejectedValueOnce(
        new Error('crypto failed'),
      );
    else
      mocks.key.mockImplementationOnce(() => {
        throw new Error('key failed');
      });
    await user.click(submit());
    await screen.findByRole('alert');
    expect(createOrderRequest).not.toHaveBeenCalled();
    expect(submit()).toBeEnabled();
    expect(useCartStore.getState().items).toHaveLength(1);
  },
);
it('a late rejected request cannot overwrite a newer successful slot selection', async () => {
  const user = await fill();
  let reject!: (reason: unknown) => void;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await user.click(screen.getByRole('button', { name: /Sutra/ }));
  await user.click(screen.getByRole('button', { name: /Sutra/ }));
  await user.click(await screen.findByRole('button', { name: '10:00' }));
  await act(async () => reject(new Error('old request failed')));
  expect(
    screen.queryByText(
      'Termine trenutno nije moguće učitati. Pokušajte ponovo.',
    ),
  ).not.toBeInTheDocument();
  expect(submit()).toBeEnabled();
});
it('a successful request preserves unrelated products added during submission', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof createOrderRequest>>) => void;
  vi.mocked(createOrderRequest).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const user = await fill();
  await user.click(submit());
  await waitFor(() => expect(createOrderRequest).toHaveBeenCalledTimes(1));
  act(() => {
    useCartStore
      .getState()
      .addItem({ ...product, productId: crypto.randomUUID(), name: 'Kifla' });
  });
  await act(async () =>
    resolve({
      orderId: crypto.randomUUID(),
      orderNumber: 'T',
      status: 'NEW',
      pickupAt: slot.value,
      totalMinor: 100,
      currencyCode: 'RSD',
    }),
  );
  expect(useCartStore.getState().items.map((item) => item.name)).toEqual([
    'Kifla',
  ]);
  expect(mocks.push).toHaveBeenCalledTimes(1);
});
it('changes to order acceptance while checkout is open disable submission without clearing the cart', async () => {
  const user = await fill();
  vi.mocked(fetch).mockImplementation(async (url) =>
    json(
      String(url).includes('pickup-availability')
        ? {
            ...availability,
            orderAcceptingEnabled: false,
            dates: [],
            earliestSlot: null,
          }
        : { slots: [], bakeryTimezone: 'Europe/Belgrade' },
    ),
  );
  fireEvent.focus(window);
  await waitFor(() => expect(submit()).toBeDisabled());
  expect(useCartStore.getState().items).toHaveLength(1);
  expect(screen.getByLabelText('Ime i prezime')).toHaveValue('Petar Petrović');
  await user.click(submit());
  expect(createOrderRequest).not.toHaveBeenCalled();
});

it('an ambiguous submission survives remount and can be checked even after its slot expires', async () => {
  vi.mocked(createOrderRequest).mockRejectedValueOnce(
    new TypeError('lost response'),
  );
  const user = await fill();
  await user.click(submit());
  await screen.findByRole('alert');
  expect(submit()).toBeDisabled();
  const original = vi.mocked(createOrderRequest).mock.calls[0]![0];
  const { cleanup } = await import('@testing-library/react');
  cleanup();
  render(
    <CheckoutForm
      pickupAvailability={{ ...availability, dates: [], earliestSlot: null }}
    />,
  );
  const retry = await screen.findByRole('button', {
    name: 'Proveri poslatu porudžbinu',
  });
  vi.mocked(createOrderRequest).mockResolvedValueOnce({
    orderId: crypto.randomUUID(),
    orderNumber: 'T',
    status: 'NEW',
    pickupAt: slot.value,
    totalMinor: 100,
    currencyCode: 'RSD',
  });
  await user.click(retry);
  await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
  expect(vi.mocked(createOrderRequest).mock.calls[1]![0]).toEqual(original);
});

// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const route = vi.hoisted(() => ({
  query: 'page=3&active=true',
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: route.push }),
  usePathname: () => '/admin/products',
  useSearchParams: () => new URLSearchParams(route.query),
}));
import { ListFilters } from './list-filters';
afterEach(() => {
  vi.useRealTimers();
  route.push.mockClear();
  route.query = 'page=3&active=true';
});
it('debounces partial search, retains other filters, and resets the page', () => {
  vi.useFakeTimers();
  render(<ListFilters />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Kif' } });
  act(() => vi.advanceTimersByTime(299));
  expect(route.push).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(route.push).toHaveBeenCalledWith('/admin/products?active=true&q=Kif', {
    scroll: false,
  });
});
it('restores the URL search on back/forward navigation and combines a dropdown with the draft search', () => {
  const fields = [
    {
      name: 'available',
      label: 'Dostupnost',
      options: [{ value: 'true', label: 'Dostupan' }],
    },
  ];
  const view = render(<ListFilters fields={fields} />);
  route.query = 'q=Hleb&page=2';
  view.rerender(<ListFilters fields={fields} />);
  expect(screen.getByRole('searchbox')).toHaveValue('Hleb');
  fireEvent.change(screen.getByLabelText('Dostupnost'), {
    target: { value: 'true' },
  });
  expect(route.push).toHaveBeenCalledWith(
    '/admin/products?q=Hleb&available=true',
    { scroll: false },
  );
});

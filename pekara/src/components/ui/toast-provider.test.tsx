// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ToastProvider } from './toast-provider';
import { toast, useToastStore } from '@/lib/toast';
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/products' }));
afterEach(() => {
  useToastStore.setState({ messages: [] });
  vi.useRealTimers();
});

it('consumes an encoded redirect notice exactly once', () => {
  document.cookie = `bakery-notice=${encodeURIComponent('Kategorija je uspešno kreirana.')}; Path=/`;
  const view = render(<ToastProvider />);
  expect(screen.getByText('Kategorija je uspešno kreirana.')).toBeVisible();
  view.rerender(<ToastProvider />);
  expect(screen.getAllByText('Kategorija je uspešno kreirana.')).toHaveLength(
    1,
  );
  expect(document.cookie).not.toContain('bakery-notice=');
});
it('shows concurrent typed notifications for five seconds and dismisses after slide-out', () => {
  vi.useFakeTimers();
  render(<ToastProvider />);
  act(() => {
    toast.success('Sačuvano');
    toast.error('Greška');
  });
  expect(screen.getByRole('status')).toHaveTextContent('Sačuvano');
  expect(screen.getByRole('alert')).toHaveTextContent('Greška');
  act(() => vi.advanceTimersByTime(4999));
  expect(screen.getByText('Sačuvano')).toBeVisible();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText('Sačuvano').closest('li')).toHaveAttribute(
    'data-closing',
    'true',
  );
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText('Sačuvano')).toBeNull();
});

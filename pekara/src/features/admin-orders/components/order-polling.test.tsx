// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OrderPolling } from './order-polling';
const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  router.refresh.mockReset();
});
it('polls only visible idle views, resumes on visibility and reports offline/stale data', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-24T10:00:00Z'));
  let visible = 'visible';
  let online = true;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
    () => visible as DocumentVisibilityState,
  );
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  render(
    <>
      <input aria-label="Filter" />
      <OrderPolling refreshedAt="2026-11-24T10:00:00Z" />
    </>,
  );
  await act(() => vi.advanceTimersByTimeAsync(15000));
  expect(router.refresh).toHaveBeenCalledTimes(1);
  visible = 'hidden';
  await act(() => vi.advanceTimersByTimeAsync(15000));
  expect(router.refresh).toHaveBeenCalledTimes(1);
  visible = 'visible';
  fireEvent(document, new Event('visibilitychange'));
  expect(router.refresh).toHaveBeenCalledTimes(2);
  screen.getByLabelText('Filter').focus();
  await act(() => vi.advanceTimersByTimeAsync(15000));
  expect(router.refresh).toHaveBeenCalledTimes(2);
  screen.getByLabelText('Filter').blur();
  online = false;
  fireEvent(window, new Event('offline'));
  expect(screen.getByRole('status')).toHaveTextContent('Veza je prekinuta');
  online = true;
  fireEvent(window, new Event('online'));
  await act(() => vi.advanceTimersByTimeAsync(15000));
  expect(screen.getByRole('status')).toHaveTextContent('Podaci nisu osveženi');
});
it('does not overlap refreshes while a transition remains pending', async () => {
  const gate = Promise.withResolvers<void>();
  router.refresh.mockImplementation(() => gate.promise);
  render(<OrderPolling />);
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(screen.getByRole('button'));
  expect(router.refresh).toHaveBeenCalledTimes(1);
  await act(async () => gate.resolve());
});

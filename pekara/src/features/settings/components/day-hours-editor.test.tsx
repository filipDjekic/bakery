// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DayHoursEditor } from './day-hours-editor';
it('retains a partial wall-time draft and only emits valid minute values including 24:00 closing', () => {
  const change = vi.fn();
  render(
    <DayHoursEditor
      weekday={1}
      label="Ponedeljak"
      intervals={[{ weekday: 1, openMinute: 360, closeMinute: 1440 }]}
      onChange={change}
    />,
  );
  const open = screen.getByLabelText('Ponedeljak od 1');
  expect(open).toHaveValue('06:00');
  expect(screen.getByLabelText('Ponedeljak do 1')).toHaveValue('24:00');
  fireEvent.change(open, { target: { value: '1' } });
  expect(open).toHaveValue('1');
  expect(open).toBeInvalid();
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(open, { target: { value: '14:30' } });
  expect(change).toHaveBeenLastCalledWith([
    { weekday: 1, openMinute: 870, closeMinute: 1440 },
  ]);
});

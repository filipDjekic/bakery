// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

function TestControl() {
  return <button type="button">Potvrdi</button>;
}

describe('unit and component test environment', () => {
  test('runs a pure unit assertion', () => {
    expect(2 + 2).toBe(4);
  });

  test('renders React components with DOM matchers', () => {
    render(<TestControl />);

    expect(
      screen.getByRole('button', { name: 'Potvrdi' }),
    ).toBeInTheDocument();
  });
});

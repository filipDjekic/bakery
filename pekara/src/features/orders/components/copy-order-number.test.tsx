// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyOrderNumber } from './copy-order-number';

describe('copy order number', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('copies the order number and announces success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<CopyOrderNumber orderNumber="PK-260924-ABC123" />);

    await user.click(screen.getByRole('button', { name: 'Kopiraj broj' }));

    expect(writeText).toHaveBeenCalledWith('PK-260924-ABC123');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Broj porudžbine je kopiran.',
    );
  });

  it('announces a recoverable failure when clipboard access is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(<CopyOrderNumber orderNumber="PK-260924-ABC123" />);

    await user.click(screen.getByRole('button', { name: 'Kopiraj broj' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Kopiranje nije uspelo. Označite i kopirajte broj ručno.',
    );
  });
});

// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingsFormActions } from './settings-form-actions';

describe('SettingsFormActions', () => {
  it('disables save while idle or saving and exposes dirty state', () => {
    const { rerender } = render(
      <SettingsFormActions
        state={{ status: 'idle' }}
        pending={false}
        dirty={false}
        idleLabel="Sačuvaj"
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(
      <SettingsFormActions
        state={{ status: 'idle' }}
        pending={false}
        dirty
        idleLabel="Sačuvaj"
      />,
    );
    expect(screen.getByText('Nesačuvane izmene')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();

    rerender(
      <SettingsFormActions
        state={{ status: 'idle' }}
        pending
        dirty
        idleLabel="Sačuvaj"
      />,
    );
    expect(screen.getByRole('button', { name: 'Čuvanje…' })).toBeDisabled();
  });

  it.each([
    ['success', 'Sačuvano', 'status'],
    ['error', 'Izmene nisu sačuvane.', 'alert'],
  ] as const)('renders accessible %s feedback', (status, message, role) => {
    render(
      <SettingsFormActions
        state={{ status, message }}
        pending={false}
        dirty={status === 'error'}
        idleLabel="Sačuvaj"
      />,
    );
    expect(screen.getByRole(role)).toHaveTextContent(message);
  });
});

// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AdminMobileNav } from './admin-mobile-nav';
import { AdminSidebar } from './admin-sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/orders' }));

const adminOnlyLabels = ['Proizvodi', 'Kategorije', 'Podešavanja'];

describe('role-aware admin navigation components', () => {
  it('hides admin-only destinations from STAFF in the sidebar', () => {
    render(<AdminSidebar role="STAFF" />);

    expect(
      screen.getByRole('link', { name: 'Porudžbine' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Porudžbine' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    for (const label of adminOnlyLabels) {
      expect(
        screen.queryByRole('link', { name: label }),
      ).not.toBeInTheDocument();
    }
  });

  it('uses the same filtering in the mobile navigation', async () => {
    const user = userEvent.setup();
    render(<AdminMobileNav role="STAFF" />);
    await user.click(screen.getByRole('button', { name: 'Meni' }));

    expect(
      screen.getByRole('link', { name: 'Porudžbine' }),
    ).toBeInTheDocument();
    for (const label of adminOnlyLabels) {
      expect(
        screen.queryByRole('link', { name: label }),
      ).not.toBeInTheDocument();
    }
  });

  it('shows administrative destinations to ADMIN', () => {
    render(<AdminSidebar role="ADMIN" />);
    for (const label of adminOnlyLabels) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });
});

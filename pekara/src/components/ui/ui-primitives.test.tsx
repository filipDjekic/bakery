// @vitest-environment jsdom

import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';
import { Input } from './input';
import { PageTitle, SectionTitle } from './typography';

describe('Button', () => {
  it('renders a native button with default styling and standard props', () => {
    render(
      <Button disabled aria-label="SaÄuvaj">
        SaÄuvaj
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'SaÄuvaj' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('bg-primary');
  });

  it('supports variants and a custom class', () => {
    const { rerender } = render(
      <Button variant="danger" className="w-full">
        ObriÅ¡i
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('bg-danger', 'w-full');

    rerender(<Button variant="secondary">OtkaÅ¾i</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-surface-muted');
  });
});

describe('Input', () => {
  it('forwards standard props, invalid state, custom class and ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Input
        ref={ref}
        name="email"
        aria-label="Email"
        aria-invalid="true"
        className="mt-2"
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('aria-invalid:border-danger', 'mt-2');
    expect(ref.current).toBe(input);
  });
});

it('keeps page and section heading semantics', () => {
  render(
    <>
      <PageTitle>Stranica</PageTitle>
      <SectionTitle>Sekcija</SectionTitle>
    </>,
  );

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Stranica',
  );
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
    'Sekcija',
  );
});

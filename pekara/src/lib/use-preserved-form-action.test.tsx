// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { usePreservedFormAction } from './use-preserved-form-action';
it('retains typed input while pending and after a server validation failure', async () => {
  const gate = Promise.withResolvers<void>();
  function Form() {
    const [state, submit, pending] = usePreservedFormAction(
      async () => {
        await gate.promise;
        return { error: 'Proverite unos.' };
      },
      { error: '' },
    );
    return (
      <form onSubmit={submit}>
        <label>
          Naziv
          <input name="name" />
        </label>
        <button disabled={pending}>Sačuvaj</button>
        <p role="alert">{state.error}</p>
      </form>
    );
  }
  render(<Form />);
  fireEvent.change(screen.getByLabelText('Naziv'), {
    target: { value: 'Sačuvan unos' },
  });
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
  expect(screen.getByLabelText('Naziv')).toHaveValue('Sačuvan unos');
  gate.resolve();
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Proverite unos.'),
  );
  expect(screen.getByLabelText('Naziv')).toHaveValue('Sačuvan unos');
});

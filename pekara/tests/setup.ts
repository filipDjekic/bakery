import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

process.env.DATABASE_URL ??=
  'postgresql://test:test@127.0.0.1:5432/pekara_unit_test';
process.env.APP_URL ??= 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET ??=
  'unit-test-secret-with-at-least-32-characters';

afterEach(() => {
  cleanup();
});

// jsdom has no native dialog top layer. Real inert/focus behavior is covered by Playwright.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
}

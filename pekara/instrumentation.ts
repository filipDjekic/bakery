import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
): void {
  try {
    Sentry.captureRequestError(...args);
  } catch {
    // Monitoring outages must not affect application requests.
  }
}

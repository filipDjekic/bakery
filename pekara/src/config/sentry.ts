import type { ErrorEvent } from '@sentry/nextjs';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-forwarded-for',
  'x-real-ip',
]);

export function sentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    'development'
  );
}

export function sentryRelease(): string | undefined {
  return (
    process.env.SENTRY_RELEASE ??
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
    process.env.VERCEL_GIT_COMMIT_SHA
  );
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;

    if (event.request.headers) {
      for (const header of Object.keys(event.request.headers)) {
        if (SENSITIVE_HEADERS.has(header.toLowerCase())) {
          delete event.request.headers[header];
        }
      }
    }
  }

  return event;
}

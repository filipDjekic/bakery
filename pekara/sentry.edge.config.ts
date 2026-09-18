import * as Sentry from '@sentry/nextjs';

import {
  scrubSentryEvent,
  sentryEnvironment,
  sentryRelease,
} from './src/config/sentry.ts';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: sentryEnvironment(),
  release: sentryRelease(),
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrubSentryEvent,
});

import * as Sentry from '@sentry/nextjs';

import {
  scrubSentryEvent,
  sentryEnvironment,
  sentryRelease,
} from './src/config/sentry';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: sentryEnvironment(),
  release: sentryRelease(),
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrubSentryEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

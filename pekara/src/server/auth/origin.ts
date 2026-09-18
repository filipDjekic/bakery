import 'server-only';

const DEVELOPMENT_ORIGIN = 'http://localhost:3000';

function parseApplicationOrigin(value: string): string {
  const url = new URL(value);

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('APP_URL must be an HTTP(S) origin without a path.');
  }

  return url.origin;
}

export function getTrustedApplicationOrigins(
  appUrl = process.env.APP_URL,
  nodeEnv = process.env.NODE_ENV,
): readonly string[] {
  if (!appUrl) {
    if (nodeEnv === 'production') {
      throw new Error('APP_URL is required in production.');
    }

    return [DEVELOPMENT_ORIGIN];
  }

  const origin = parseApplicationOrigin(appUrl);

  const parsedOrigin = new URL(origin);
  const isLoopback =
    parsedOrigin.hostname === 'localhost' ||
    parsedOrigin.hostname === '127.0.0.1' ||
    parsedOrigin.hostname === '[::1]';

  if (
    nodeEnv === 'production' &&
    parsedOrigin.protocol !== 'https:' &&
    !isLoopback
  ) {
    throw new Error('APP_URL must use HTTPS in production.');
  }

  return [origin];
}

/**
 * Boundary for future cookie-authenticated Route Handlers. Server Actions and
 * Better Auth perform their own checks; custom mutation handlers must call this
 * before processing a request.
 */
export function hasTrustedMutationOrigin(
  headers: Headers,
  trustedOrigins = getTrustedApplicationOrigins(),
): boolean {
  const value = headers.get('origin');

  if (!value) {
    return false;
  }

  try {
    const origin = new URL(value).origin;
    return trustedOrigins.includes(origin) && value === origin;
  } catch {
    return false;
  }
}

export type SecurityHeader = { key: string; value: string };

export function createContentSecurityPolicy(
  environment: 'development' | 'production' | 'test' = process.env.NODE_ENV ??
    'development',
): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${environment === 'development' ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io${environment === 'development' ? ' ws: wss:' : ''}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    environment === 'production' ? 'upgrade-insecure-requests' : '',
  ].filter(Boolean);

  return directives.join('; ');
}

export function createSecurityHeaders(
  environment: 'development' | 'production' | 'test' = process.env.NODE_ENV ??
    'development',
): SecurityHeader[] {
  return [
    {
      key: 'Content-Security-Policy',
      value: createContentSecurityPolicy(environment),
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value:
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}

export const securityHeaders = createSecurityHeaders();

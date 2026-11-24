import 'server-only';
import {
  getClientIpFromTrustedHeader,
  MissingClientIpError,
  normalizeClientIp,
} from './fingerprint.ts';

export function requestClientIp(
  headers: Headers,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  // Local development/test ignores spoofable headers altogether.
  const appUrl = new URL(environment.APP_URL ?? 'http://localhost:3000');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(
    appUrl.hostname,
  );
  if (
    loopback &&
    (environment.NODE_ENV !== 'production' ||
      environment.TRUSTED_PROXY_MODE === 'local')
  )
    return '127.0.0.1';
  if (environment.VERCEL === '1') {
    // Vercel overwrites x-forwarded-for at its ingress. Do not accept an arbitrary chain.
    const value = headers.get('x-forwarded-for');
    if (!value || value.includes(',')) throw new MissingClientIpError();
    return getClientIpFromTrustedHeader(headers);
  }
  if (environment.TRUSTED_PROXY_MODE !== 'proxy')
    throw new MissingClientIpError();
  const hops = Number(environment.TRUSTED_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 1 || hops > 5)
    throw new MissingClientIpError();
  const chain =
    headers
      .get('x-forwarded-for')
      ?.split(',')
      .map((value) => value.trim()) ?? [];
  const candidate = chain[chain.length - hops];
  const ip = candidate ? normalizeClientIp(candidate) : null;
  if (!ip) throw new MissingClientIpError();
  return ip;
}

import 'server-only';

import { createHmac } from 'node:crypto';
import { isIP, SocketAddress } from 'node:net';

export class MissingClientIpError extends Error {
  constructor() {
    super('Trusted client IP header is missing or invalid.');
    this.name = 'MissingClientIpError';
  }
}

function stripAddressPort(value: string): string {
  const candidate = value.trim();
  const bracketedIpv6 = candidate.match(/^\[([^\]]+)](?::\d+)?$/);

  if (bracketedIpv6?.[1]) {
    return bracketedIpv6[1];
  }

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  return ipv4WithPort?.[1] ?? candidate;
}

export function normalizeClientIp(value: string): string | null {
  const candidate = stripAddressPort(value);
  const family = isIP(candidate);

  if (family === 4) {
    return candidate
      .split('.')
      .map((segment) => String(Number(segment)))
      .join('.');
  }

  if (family === 6) {
    const ipv4Mapped = candidate.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);

    if (ipv4Mapped?.[1] && isIP(ipv4Mapped[1]) === 4) {
      return normalizeClientIp(ipv4Mapped[1]);
    }

    return new SocketAddress({
      address: candidate,
      family: 'ipv6',
      port: 0,
    }).address;
  }

  return null;
}

export function getClientIpFromTrustedHeader(
  headers: Headers,
  trustedHeaderName = 'x-forwarded-for',
): string {
  const forwardedValue = headers.get(trustedHeaderName);
  const firstAddress = forwardedValue?.split(',')[0];
  const normalizedIp = firstAddress ? normalizeClientIp(firstAddress) : null;

  if (!normalizedIp) {
    throw new MissingClientIpError();
  }

  return normalizedIp;
}

export function createClientFingerprint(
  normalizedIp: string,
  secret: string,
): string {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Rate-limit HMAC secret must contain at least 32 bytes.');
  }

  const canonicalIp = normalizeClientIp(normalizedIp);

  if (!canonicalIp) {
    throw new Error('Cannot fingerprint an invalid client IP address.');
  }

  return createHmac('sha256', secret).update(canonicalIp).digest('hex');
}

import 'server-only';

import { ORDER_RATE_LIMIT_POLICIES } from '../../config/limits.ts';
import {
  deleteExpiredRateLimitBuckets,
  incrementRateLimitBucket,
} from '../repositories/rate-limit.ts';

export type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: string;
};

export class OrderRateLimitExceededError extends Error {
  readonly status = 429;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Too many order attempts.');
    this.name = 'OrderRateLimitExceededError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function validatePolicy(policy: RateLimitPolicy): void {
  if (
    !Number.isInteger(policy.limit) ||
    policy.limit <= 0 ||
    !Number.isInteger(policy.windowSeconds) ||
    policy.windowSeconds <= 0
  ) {
    throw new Error('Rate-limit policy is invalid.');
  }
}

export async function consumeRateLimit(
  action: string,
  fingerprint: string,
  policy: RateLimitPolicy,
  now = new Date(),
): Promise<RateLimitResult> {
  validatePolicy(policy);

  if (!action || !fingerprint || Number.isNaN(now.getTime())) {
    throw new Error('Rate-limit input is invalid.');
  }

  const windowMilliseconds = policy.windowSeconds * 1000;
  const windowStartMilliseconds =
    Math.floor(now.getTime() / windowMilliseconds) * windowMilliseconds;
  const windowStart = new Date(windowStartMilliseconds);
  const expiresAt = new Date(windowStartMilliseconds + windowMilliseconds);
  const bucket = await incrementRateLimitBucket({
    keyHash: fingerprint,
    action,
    windowStart: windowStart.toISOString(),
    windowSeconds: policy.windowSeconds,
    expiresAt: expiresAt.toISOString(),
  });
  const allowed = bucket.count <= policy.limit;

  return {
    allowed,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - bucket.count),
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
    resetAt: new Date(bucket.expiresAt).toISOString(),
  };
}

export async function enforceOrderCreateRateLimit(
  fingerprint: string,
  now = new Date(),
): Promise<RateLimitResult[]> {
  await deleteExpiredRateLimitBuckets(now.toISOString());

  const results = await Promise.all(
    ORDER_RATE_LIMIT_POLICIES.map((policy) =>
      consumeRateLimit('order:create', fingerprint, policy, now),
    ),
  );
  const retryAfterSeconds = Math.max(
    0,
    ...results
      .filter((result) => !result.allowed)
      .map((result) => result.retryAfterSeconds),
  );

  if (retryAfterSeconds > 0) {
    throw new OrderRateLimitExceededError(retryAfterSeconds);
  }

  return results;
}

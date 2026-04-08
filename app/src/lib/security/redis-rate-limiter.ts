/**
 * KLAR Redis Rate Limiter
 *
 * Upstash Redis-backed rate limiting for horizontal scaling.
 * Falls back to in-memory Maps when UPSTASH_REDIS_REST_URL is not set
 * (local dev / graceful degradation).
 *
 * All state that was previously in-memory (burstLimiter, activeRequests,
 * anonUsageMap, abuseTracker) is now stored in Redis with TTL-based expiry.
 */

import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

// ═══════════════════════════════════════════
// REDIS CLIENT (lazy init, optional)
// ═══════════════════════════════════════════

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    } catch (err) {
      logger.warn("redis_init_failed", { error: String(err) });
      return null;
    }
  }
  return null;
}

// ═══════════════════════════════════════════
// SLIDING WINDOW (Redis-backed)
// ═══════════════════════════════════════════

/**
 * Check burst rate limits using Redis sorted sets (sliding window).
 * Key: `klar:burst:{key}` with timestamp scores.
 */
export async function redisBurstCheck(
  key: string,
  perMinuteLimit: number,
  perHourLimit: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const r = getRedis();
  if (!r) return { allowed: true, retryAfterMs: 0 }; // fallback = allow

  const redisKey = `klar:burst:${key}`;
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const oneHourAgo = now - 3_600_000;

  try {
    // Pipeline: cleanup + count + add — single round-trip
    const pipe = r.pipeline();
    pipe.zremrangebyscore(redisKey, 0, oneHourAgo);       // clean old entries
    pipe.zcount(redisKey, oneMinuteAgo, "+inf");           // minute window count
    pipe.zcount(redisKey, oneHourAgo, "+inf");             // hour window count
    pipe.zadd(redisKey, { score: now, member: `${now}:${Math.random().toString(36).slice(2, 8)}` });
    pipe.expire(redisKey, 3600);                           // TTL = 1h

    const results = await pipe.exec();
    const minuteCount = (results[1] as number) || 0;
    const hourCount = (results[2] as number) || 0;

    if (minuteCount > perMinuteLimit) {
      return { allowed: false, retryAfterMs: 60_000 };
    }

    if (hourCount > perHourLimit) {
      return { allowed: false, retryAfterMs: 300_000 };
    }

    return { allowed: true, retryAfterMs: 0 };
  } catch (err) {
    logger.warn("redis_burst_check_error", { key, error: String(err) });
    return { allowed: true, retryAfterMs: 0 }; // fail open
  }
}

// ═══════════════════════════════════════════
// CONCURRENCY GUARD (Redis-backed)
// ═══════════════════════════════════════════

/**
 * Atomic concurrency slot using Redis SET NX with TTL.
 * Key: `klar:concurrent:{key}` with 120s TTL (auto-expire if crash).
 */
export async function redisAcquireConcurrency(key: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return true; // fallback = allow

  try {
    const redisKey = `klar:concurrent:${key}`;
    const result = await r.set(redisKey, "1", { nx: true, ex: 120 });
    return result === "OK";
  } catch (err) {
    logger.warn("redis_concurrency_error", { key, error: String(err) });
    return true; // fail open
  }
}

export async function redisReleaseConcurrency(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    await r.del(`klar:concurrent:${key}`);
  } catch {
    // best-effort release
  }
}

// ═══════════════════════════════════════════
// ANONYMOUS QUOTA (Redis-backed)
// ═══════════════════════════════════════════

/**
 * Track anonymous usage with Redis INCRBY + EXPIREAT.
 * Key: `klar:anon:{ip}` with monthly TTL.
 */
export async function redisCheckAnonymousQuota(
  ip: string,
  cost: number,
  monthlyLimit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const r = getRedis();
  if (!r) return { allowed: true, remaining: monthlyLimit, resetAt: new Date(Date.now() + 30 * 24 * 3600_000) };

  const redisKey = `klar:anon:${ip}`;

  try {
    const pipe = r.pipeline();
    pipe.incrby(redisKey, cost);
    pipe.ttl(redisKey);
    const results = await pipe.exec();

    const currentCount = (results[0] as number) || 0;
    const ttl = (results[1] as number) || -1;

    // First request — set 30-day TTL
    if (ttl === -1 || currentCount <= cost) {
      const monthSeconds = 30 * 24 * 3600;
      await r.expire(redisKey, monthSeconds);
      const resetAt = new Date(Date.now() + monthSeconds * 1000);
      return {
        allowed: currentCount <= monthlyLimit,
        remaining: Math.max(0, monthlyLimit - currentCount),
        resetAt,
      };
    }

    const resetAt = new Date(Date.now() + ttl * 1000);
    if (currentCount > monthlyLimit) {
      // Undo the increment since request is denied
      await r.decrby(redisKey, cost).catch(() => {});
      return { allowed: false, remaining: Math.max(0, monthlyLimit - currentCount + cost), resetAt };
    }

    return { allowed: true, remaining: Math.max(0, monthlyLimit - currentCount), resetAt };
  } catch (err) {
    logger.warn("redis_anon_quota_error", { ip, error: String(err) });
    return { allowed: true, remaining: monthlyLimit, resetAt: new Date(Date.now() + 30 * 24 * 3600_000) };
  }
}

// ═══════════════════════════════════════════
// ABUSE TRACKING (Redis-backed)
// ═══════════════════════════════════════════

/**
 * Check if an IP is currently blocked.
 * Key: `klar:blocked:{ip}` — exists means blocked.
 */
export async function redisIsAbusiveIP(ip: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;

  try {
    const exists = await r.exists(`klar:blocked:${ip}`);
    return exists === 1;
  } catch {
    return false; // fail open
  }
}

/**
 * Record a violation and auto-block after threshold.
 * Key: `klar:violations:{ip}` with 1h TTL, `klar:blocked:{ip}` with escalating TTL.
 */
export async function redisRecordViolation(ip: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    const key = `klar:violations:${ip}`;
    const count = await r.incr(key);

    // Set 1h TTL on first violation
    if (count === 1) {
      await r.expire(key, 3600);
    }

    // Escalating blocks
    let blockSeconds = 0;
    if (count >= 15) blockSeconds = 7200;      // 2h
    else if (count >= 10) blockSeconds = 1800;  // 30m
    else if (count >= 5) blockSeconds = 300;    // 5m

    if (blockSeconds > 0) {
      await r.set(`klar:blocked:${ip}`, "1", { ex: blockSeconds });
      logger.warn("ip_blocked", { ip, violations: count, blockSeconds });
    }
  } catch (err) {
    logger.warn("redis_violation_error", { ip, error: String(err) });
  }
}

// ═══════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════

export async function redisHealthCheck(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;

  try {
    const result = await r.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}

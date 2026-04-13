/**
 * KLAR Rate Limiter & Usage Governor
 *
 * Multi-layer rate limiting with tier-based quotas, burst protection,
 * cost-weighted analysis tracking, and abuse detection.
 *
 * Uses Upstash Redis when available (production), falls back to in-memory
 * Maps for local development. All public API unchanged.
 *
 * Layers:
 *  1. IP-based burst limiter (sliding window, Redis or in-memory)
 *  2. Tier-based monthly quota (DB-backed via Supabase profile)
 *  3. Cost-weighted analysis budgets (comprehensive costs more)
 *  4. Anonymous fingerprint tracking (IP + UA hash)
 *  5. Abuse scoring (rapid-fire, suspicious patterns)
 */

import type { AnalysisMode, UserPlan } from "@/types";
import {
  redisBurstCheck,
  redisAcquireConcurrency,
  redisReleaseConcurrency,
  redisCheckAnonymousQuota,
  redisIsAbusiveIP,
  redisRecordViolation,
  isRedisAvailable,
} from "./redis-rate-limiter";

// ═══════════════════════════════════════════
// PLAN CONFIGURATION
// ═══════════════════════════════════════════

export interface PlanConfig {
  /** Monthly verification quota */
  monthlyLimit: number;
  /** Max verifications per minute (burst protection) */
  perMinuteLimit: number;
  /** Max verifications per hour */
  perHourLimit: number;
  /** Max characters per request */
  maxChars: number;
  /** Max file size in bytes */
  maxFileSize: number;
  /** Allowed analysis modes */
  allowedModes: AnalysisMode[];
  /** Cost multiplier for comprehensive mode (counts as N verifications) */
  comprehensiveCost: number;
  /** Whether concurrent requests are allowed */
  allowConcurrent: boolean;
}

export const PLAN_CONFIGS: Record<UserPlan | "guest", PlanConfig> = {
  guest: {
    monthlyLimit: 3,
    perMinuteLimit: 1,
    perHourLimit: 2,
    maxChars: 2000,
    maxFileSize: 0, // no file upload for guests
    allowedModes: ["fact-check"],
    comprehensiveCost: 3,
    allowConcurrent: false,
  },
  free: {
    monthlyLimit: 10,
    perMinuteLimit: 2,
    perHourLimit: 5,
    maxChars: 5000,
    maxFileSize: 2 * 1024 * 1024, // 2 MB
    allowedModes: ["fact-check", "bias-check", "ai-detection"],
    comprehensiveCost: 3,
    allowConcurrent: false,
  },
  pro: {
    monthlyLimit: 200,
    perMinuteLimit: 5,
    perHourLimit: 30,
    maxChars: 25000,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    allowedModes: ["fact-check", "bias-check", "ai-detection", "plagiarism", "ai-transparency", "security-headers", "comprehensive"],
    comprehensiveCost: 2,
    allowConcurrent: true,
  },
  team: {
    monthlyLimit: 999999,
    perMinuteLimit: 10,
    perHourLimit: 100,
    maxChars: 50000,
    maxFileSize: 10 * 1024 * 1024,
    allowedModes: ["fact-check", "bias-check", "ai-detection", "plagiarism", "ai-transparency", "security-headers", "comprehensive"],
    comprehensiveCost: 1,
    allowConcurrent: true,
  },
  enterprise: {
    monthlyLimit: 999999,
    perMinuteLimit: 20,
    perHourLimit: 500,
    maxChars: 50000,
    maxFileSize: 10 * 1024 * 1024,
    allowedModes: ["fact-check", "bias-check", "ai-detection", "plagiarism", "ai-transparency", "security-headers", "comprehensive"],
    comprehensiveCost: 1,
    allowConcurrent: true,
  },
};

// ═══════════════════════════════════════════
// COST CALCULATION
// ═══════════════════════════════════════════

/**
 * Calculate how many "credits" a request costs based on selected analyses.
 * Comprehensive mode costs more because it runs all engines + hits Gemini.
 */
export function calculateRequestCost(
  analyses: AnalysisMode[],
  plan: UserPlan | "guest"
): number {
  const config = PLAN_CONFIGS[plan];
  if (analyses.includes("comprehensive")) {
    return config.comprehensiveCost;
  }
  // Each analysis mode beyond the first adds 0.5 cost
  // But minimum is always 1
  return Math.max(1, 1 + (analyses.length - 1) * 0.5);
}

// ═══════════════════════════════════════════
// SLIDING WINDOW RATE LIMITER (in-memory)
// ═══════════════════════════════════════════

interface SlidingWindowEntry {
  timestamps: number[];
}

const burstLimiter = new Map<string, SlidingWindowEntry>();
const activeRequests = new Set<string>();
let lastBurstCleanup = Date.now();

/** Clean up expired entries every 5 minutes */
function cleanupBurstLimiter() {
  const now = Date.now();
  if (now - lastBurstCleanup < 5 * 60 * 1000) return;
  lastBurstCleanup = now;

  const oneHourAgo = now - 60 * 60 * 1000;
  for (const [key, entry] of burstLimiter) {
    entry.timestamps = entry.timestamps.filter((t) => t > oneHourAgo);
    if (entry.timestamps.length === 0) burstLimiter.delete(key);
  }
}

/**
 * Check burst rate limits (per-minute and per-hour).
 * Uses Redis when available, falls back to in-memory sliding window.
 * Returns { allowed, retryAfterMs } — if not allowed, retryAfterMs indicates when to retry.
 */
export async function checkBurstLimit(
  key: string,
  plan: UserPlan | "guest"
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const config = PLAN_CONFIGS[plan];

  // Try Redis first (horizontally scalable)
  if (isRedisAvailable()) {
    return redisBurstCheck(key, config.perMinuteLimit, config.perHourLimit);
  }

  // Fallback: in-memory sliding window
  return checkBurstLimitInMemory(key, plan);
}

function checkBurstLimitInMemory(
  key: string,
  plan: UserPlan | "guest"
): { allowed: boolean; retryAfterMs: number } {
  cleanupBurstLimiter();
  const config = PLAN_CONFIGS[plan];
  const now = Date.now();

  const entry = burstLimiter.get(key) || { timestamps: [] };

  // Count requests in last minute
  const oneMinuteAgo = now - 60 * 1000;
  const recentMinute = entry.timestamps.filter((t) => t > oneMinuteAgo);
  if (recentMinute.length >= config.perMinuteLimit) {
    const oldestInWindow = Math.min(...recentMinute);
    return { allowed: false, retryAfterMs: oldestInWindow + 60 * 1000 - now };
  }

  // Count requests in last hour
  const oneHourAgo = now - 60 * 60 * 1000;
  const recentHour = entry.timestamps.filter((t) => t > oneHourAgo);
  if (recentHour.length >= config.perHourLimit) {
    const oldestInWindow = Math.min(...recentHour);
    return { allowed: false, retryAfterMs: oldestInWindow + 60 * 60 * 1000 - now };
  }

  // Record this request
  entry.timestamps.push(now);
  burstLimiter.set(key, entry);

  return { allowed: true, retryAfterMs: 0 };
}

// ═══════════════════════════════════════════
// CONCURRENCY GUARD
// ═══════════════════════════════════════════

/**
 * Prevent multiple simultaneous verifications from the same user/IP.
 * Uses Redis SET NX when available for cross-instance safety.
 * Returns false if the user already has an active request (and their plan disallows concurrency).
 */
export async function acquireConcurrencySlot(
  key: string,
  plan: UserPlan | "guest"
): Promise<boolean> {
  if (PLAN_CONFIGS[plan].allowConcurrent) return true;

  // Try Redis first
  if (isRedisAvailable()) {
    return redisAcquireConcurrency(key);
  }

  // Fallback: in-memory
  if (activeRequests.has(key)) return false;
  activeRequests.add(key);
  return true;
}

export async function releaseConcurrencySlot(key: string): Promise<void> {
  if (isRedisAvailable()) {
    await redisReleaseConcurrency(key);
  }
  activeRequests.delete(key);
}

// ═══════════════════════════════════════════
// ANONYMOUS FINGERPRINTING
// ═══════════════════════════════════════════

const anonUsageMap = new Map<string, { count: number; resetAt: number; lastRequest: number }>();
let lastAnonCleanup = Date.now();

/**
 * Track anonymous/guest usage by IP fingerprint.
 * Uses Redis when available for cross-instance tracking.
 * Returns { allowed, remaining, resetAt }.
 */
export async function checkAnonymousQuota(
  ip: string,
  cost: number = 1
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const limit = PLAN_CONFIGS.guest.monthlyLimit;

  // Try Redis first
  if (isRedisAvailable()) {
    return redisCheckAnonymousQuota(ip, cost, limit);
  }

  // Fallback: in-memory
  return checkAnonymousQuotaInMemory(ip, cost);
}

function checkAnonymousQuotaInMemory(
  ip: string,
  cost: number = 1
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();

  // Cleanup every 10 min
  if (now - lastAnonCleanup > 10 * 60 * 1000) {
    for (const [k, v] of anonUsageMap) {
      if (v.resetAt < now) anonUsageMap.delete(k);
    }
    lastAnonCleanup = now;
  }

  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const limit = PLAN_CONFIGS.guest.monthlyLimit;
  const entry = anonUsageMap.get(ip);

  if (!entry || entry.resetAt < now) {
    anonUsageMap.set(ip, { count: cost, resetAt: now + monthMs, lastRequest: now });
    return { allowed: true, remaining: limit - cost, resetAt: new Date(now + monthMs) };
  }

  if (entry.count + cost > limit) {
    return { allowed: false, remaining: Math.max(0, limit - entry.count), resetAt: new Date(entry.resetAt) };
  }

  entry.count += cost;
  entry.lastRequest = now;
  return { allowed: true, remaining: limit - entry.count, resetAt: new Date(entry.resetAt) };
}

// ═══════════════════════════════════════════
// ABUSE DETECTION
// ═══════════════════════════════════════════

interface AbuseRecord {
  violations: number;
  blockedUntil: number;
  lastViolation: number;
}

const abuseTracker = new Map<string, AbuseRecord>();

/**
 * Check if an IP should be temporarily blocked.
 * Uses Redis when available for cross-instance abuse tracking.
 */
export async function isAbusiveIP(ip: string): Promise<boolean> {
  if (isRedisAvailable()) {
    return redisIsAbusiveIP(ip);
  }
  return isAbusiveIPInMemory(ip);
}

function isAbusiveIPInMemory(ip: string): boolean {
  const record = abuseTracker.get(ip);
  if (!record) return false;
  if (record.blockedUntil > Date.now()) return true;
  // Auto-expire after block period
  if (record.violations > 0 && Date.now() - record.lastViolation > 60 * 60 * 1000) {
    abuseTracker.delete(ip);
    return false;
  }
  return false;
}

/**
 * Record a rate-limit violation. After 5 violations within an hour,
 * temporarily block the IP for escalating durations.
 * Uses Redis when available.
 */
export async function recordViolation(ip: string): Promise<void> {
  if (isRedisAvailable()) {
    return redisRecordViolation(ip);
  }
  recordViolationInMemory(ip);
}

function recordViolationInMemory(ip: string): void {
  const now = Date.now();
  const record = abuseTracker.get(ip) || { violations: 0, blockedUntil: 0, lastViolation: 0 };

  // Reset if last violation was over an hour ago
  if (now - record.lastViolation > 60 * 60 * 1000) {
    record.violations = 0;
  }

  record.violations++;
  record.lastViolation = now;

  // Escalating blocks: 5 violations = 5 min, 10 = 30 min, 15+ = 2 hours
  if (record.violations >= 15) {
    record.blockedUntil = now + 2 * 60 * 60 * 1000;
  } else if (record.violations >= 10) {
    record.blockedUntil = now + 30 * 60 * 1000;
  } else if (record.violations >= 5) {
    record.blockedUntil = now + 5 * 60 * 1000;
  }

  abuseTracker.set(ip, record);
}

// ═══════════════════════════════════════════
// REQUEST VALIDATION
// ═══════════════════════════════════════════

export interface UsageCheckResult {
  allowed: boolean;
  error?: string;
  statusCode?: number;
  /** Seconds until the client can retry */
  retryAfter?: number;
  /** Usage info to return to the client */
  usage?: {
    used: number;
    limit: number;
    remaining: number;
    plan: string;
    resetAt: string;
  };
  /** The effective cost of this request */
  cost: number;
}

/**
 * Validate a request's analysis modes against plan restrictions.
 * Strips disallowed modes and returns the filtered list.
 */
export function filterAllowedModes(
  analyses: AnalysisMode[],
  plan: UserPlan | "guest"
): { filtered: AnalysisMode[]; blocked: AnalysisMode[] } {
  const allowed = PLAN_CONFIGS[plan].allowedModes;
  const filtered: AnalysisMode[] = [];
  const blocked: AnalysisMode[] = [];

  for (const mode of analyses) {
    if (allowed.includes(mode)) {
      filtered.push(mode);
    } else {
      blocked.push(mode);
    }
  }

  // Ensure at least fact-check
  if (filtered.length === 0) filtered.push("fact-check");
  return { filtered, blocked };
}

/**
 * Check character limit for the given plan.
 */
export function checkCharLimit(
  textLength: number,
  plan: UserPlan | "guest"
): boolean {
  return textLength <= PLAN_CONFIGS[plan].maxChars;
}

/**
 * Check file size limit for the given plan.
 */
export function checkFileLimit(
  fileSize: number,
  plan: UserPlan | "guest"
): { allowed: boolean; maxSize: number } {
  const maxSize = PLAN_CONFIGS[plan].maxFileSize;
  return { allowed: fileSize <= maxSize, maxSize };
}

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server module
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => Promise.resolve({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  }),
}));

import {
  generateApiKey,
  hasScope,
  checkApiKeyRateLimit,
} from "@/lib/security/api-key-auth";
import type { ApiKeyAuth } from "@/lib/security/api-key-auth";

// ═══════════════════════════════════════════
// API Key Generation
// ═══════════════════════════════════════════

describe("API Key Generation", () => {
  it("generates a key with klar_ prefix", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(rawKey).toMatch(/^klar_[a-f0-9]{8}_[a-f0-9]{48}$/);
    expect(keyPrefix).toMatch(/^klar_[a-f0-9]{8}$/);
  });

  it("returns a SHA-256 hash (64 hex chars)", () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique keys each time", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1.rawKey).not.toBe(key2.rawKey);
    expect(key1.keyHash).not.toBe(key2.keyHash);
    expect(key1.keyPrefix).not.toBe(key2.keyPrefix);
  });

  it("hash is deterministic for same key", () => {
    const { rawKey, keyHash } = generateApiKey();
    // Re-hash manually
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    const rehash = crypto.createHash("sha256").update(rawKey).digest("hex");
    expect(rehash).toBe(keyHash);
  });

  it("prefix matches the start of the raw key", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(rawKey.startsWith(keyPrefix)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Scope Checking
// ═══════════════════════════════════════════

describe("API Key Scope Checking", () => {
  const mockAuth: ApiKeyAuth = {
    keyId: "test-key-id",
    userId: "test-user-id",
    orgId: null,
    scopes: ["verify", "batch"],
    plan: "pro",
    rateLimitPerMinute: 10,
  };

  it("returns true for granted scope", () => {
    expect(hasScope(mockAuth, "verify")).toBe(true);
    expect(hasScope(mockAuth, "batch")).toBe(true);
  });

  it("returns false for missing scope", () => {
    expect(hasScope(mockAuth, "compliance")).toBe(false);
    expect(hasScope(mockAuth, "export")).toBe(false);
  });

  it("handles empty scopes array", () => {
    const emptyAuth = { ...mockAuth, scopes: [] as ApiKeyAuth["scopes"] };
    expect(hasScope(emptyAuth, "verify")).toBe(false);
  });

  it("handles all scopes granted", () => {
    const fullAuth: ApiKeyAuth = {
      ...mockAuth,
      scopes: ["verify", "export", "batch", "compliance"],
    };
    expect(hasScope(fullAuth, "verify")).toBe(true);
    expect(hasScope(fullAuth, "compliance")).toBe(true);
    expect(hasScope(fullAuth, "batch")).toBe(true);
  });
});

// ═══════════════════════════════════════════
// API Key Rate Limiting
// ═══════════════════════════════════════════

describe("API Key Rate Limiting", () => {
  beforeEach(() => {
    // Reset by using unique key IDs
    vi.useFakeTimers();
  });

  it("allows first request", () => {
    const result = checkApiKeyRateLimit("rate-test-" + Date.now(), 10);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it("allows multiple requests up to limit", () => {
    const keyId = "rate-multi-" + Date.now();
    for (let i = 0; i < 5; i++) {
      const result = checkApiKeyRateLimit(keyId, 5);
      if (i < 5) expect(result.allowed).toBe(true);
    }
  });

  it("blocks after limit is reached", () => {
    const keyId = "rate-block-" + Math.random();
    // Fill up the limit
    for (let i = 0; i < 3; i++) {
      checkApiKeyRateLimit(keyId, 3);
    }
    const blocked = checkApiKeyRateLimit(keyId, 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows requests after window expires", () => {
    const keyId = "rate-expire-" + Math.random();
    // Fill up
    for (let i = 0; i < 2; i++) {
      checkApiKeyRateLimit(keyId, 2);
    }
    expect(checkApiKeyRateLimit(keyId, 2).allowed).toBe(false);

    // Advance past 1-minute window
    vi.advanceTimersByTime(61_000);
    expect(checkApiKeyRateLimit(keyId, 2).allowed).toBe(true);
  });

  it("handles rate limit of 1 (strictest)", () => {
    const keyId = "rate-one-" + Math.random();
    expect(checkApiKeyRateLimit(keyId, 1).allowed).toBe(true);
    expect(checkApiKeyRateLimit(keyId, 1).allowed).toBe(false);
  });

  it("retryAfterMs is within 60s window", () => {
    const keyId = "rate-retry-" + Math.random();
    checkApiKeyRateLimit(keyId, 1);
    const result = checkApiKeyRateLimit(keyId, 1);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });
});

// ═══════════════════════════════════════════
// Edge Cases & Negative Tests
// ═══════════════════════════════════════════

describe("API Key Auth — Edge Cases", () => {
  it("generateApiKey produces different prefix and hash for each call in quick succession", () => {
    const keys = Array.from({ length: 10 }, () => generateApiKey());
    const prefixes = new Set(keys.map((k) => k.keyPrefix));
    const hashes = new Set(keys.map((k) => k.keyHash));
    // All should be unique
    expect(prefixes.size).toBe(10);
    expect(hashes.size).toBe(10);
  });

  it("generated key format is safe for HTTP Bearer header", () => {
    const { rawKey } = generateApiKey();
    // Should not contain whitespace, newlines, or control chars
    expect(rawKey).toMatch(/^[a-zA-Z0-9_]+$/);
    // Should not be too long for a header value
    expect(rawKey.length).toBeLessThan(200);
  });

  it("rate limiter handles concurrent calls to same key", () => {
    const keyId = "concurrent-" + Math.random();
    const results = Array.from({ length: 5 }, () => checkApiKeyRateLimit(keyId, 3));
    const allowed = results.filter((r) => r.allowed).length;
    const blocked = results.filter((r) => !r.allowed).length;
    expect(allowed).toBe(3);
    expect(blocked).toBe(2);
  });

  it("rate limiter handles very high limit", () => {
    const keyId = "high-limit-" + Math.random();
    for (let i = 0; i < 100; i++) {
      const result = checkApiKeyRateLimit(keyId, 100);
      expect(result.allowed).toBe(true);
    }
    expect(checkApiKeyRateLimit(keyId, 100).allowed).toBe(false);
  });
});

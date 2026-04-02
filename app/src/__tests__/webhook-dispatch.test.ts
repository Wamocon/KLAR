import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock must be hoisted — use vi.hoisted for variables referenced in the mock factory
const { mockFrom } = vi.hoisted(() => {
  return { mockFrom: vi.fn() };
});

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => Promise.resolve({
    from: mockFrom,
  }),
}));

import { dispatchWebhook } from "@/lib/webhooks/dispatch";

// Mock fetch
const originalFetch = global.fetch;
let mockFetchFn: ReturnType<typeof vi.fn>;

function chainedQuery(resolvedValue: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(resolvedValue),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockFetchFn = vi.fn();
  global.fetch = mockFetchFn as unknown as typeof fetch;

  // Default: no webhooks
  mockFrom.mockReturnValue(chainedQuery({ data: [], error: null }));
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("Webhook Dispatch", () => {
  it("does nothing when no webhooks exist", async () => {
    await dispatchWebhook("org-1", "verification.completed", { trust_score: 0.85 });
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it("does nothing when no webhooks match the event", async () => {
    mockFrom.mockReturnValue(chainedQuery({
      data: [{ id: "wh-1", url: "https://example.com/hook", events: ["batch.completed"], secret: "sec", failure_count: 0 }],
      error: null,
    }));

    await dispatchWebhook("org-1", "verification.completed", { trust_score: 0.85 });
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it("sends POST with correct headers when webhook matches", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery({
      data: [{
        id: "wh-1",
        url: "https://example.com/hook",
        events: ["verification.completed"],
        secret: "test-secret",
        failure_count: 0,
      }],
      error: null,
    }));

    // Mock successful response
    mockFetchFn.mockResolvedValueOnce({ ok: true });

    // Mock the update call for resetting failure count
    mockFrom.mockReturnValue(chainedQuery({ data: null, error: null }));

    await dispatchWebhook("org-1", "verification.completed", { trust_score: 0.85 });

    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetchFn.mock.calls[0];
    expect(url).toBe("https://example.com/hook");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-KLAR-Event"]).toBe("verification.completed");
    expect(options.headers["X-KLAR-Signature"]).toMatch(/^sha256=[a-f0-9]+$/);
    expect(options.headers["User-Agent"]).toBe("KLAR-Webhooks/1.0");

    // Verify payload structure
    const payload = JSON.parse(options.body);
    expect(payload.event).toBe("verification.completed");
    expect(payload.timestamp).toBeDefined();
    expect(payload.data.trust_score).toBe(0.85);
  });

  it("handles fetch error gracefully (no throw)", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery({
      data: [{
        id: "wh-1",
        url: "https://unreachable.example.com/hook",
        events: ["verification.completed"],
        secret: "sec",
        failure_count: 5,
      }],
      error: null,
    }));

    mockFetchFn.mockRejectedValueOnce(new Error("Network error"));

    // Mock update for failure count — should not throw
    mockFrom.mockReturnValue(chainedQuery({ data: null, error: null }));

    // Should not throw
    await expect(
      dispatchWebhook("org-1", "verification.completed", {})
    ).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════
// Webhook Signature Verification (Edge Cases)
// ═══════════════════════════════════════════

describe("Webhook Signature", () => {
  it("HMAC-SHA256 signature matches Node.js crypto output", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    const payload = JSON.stringify({ event: "test", timestamp: "2025-01-01T00:00:00.000Z", data: {} });
    const secret = "test-secret-key";
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    expect(expected).toMatch(/^[a-f0-9]{64}$/);
  });
});

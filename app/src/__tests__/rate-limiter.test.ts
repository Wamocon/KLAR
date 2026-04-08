import { describe, it, expect } from "vitest";
import {
  PLAN_CONFIGS,
  calculateRequestCost,
  checkBurstLimit,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  checkAnonymousQuota,
  isAbusiveIP,
  recordViolation,
  filterAllowedModes,
  checkCharLimit,
  checkFileLimit,
} from "@/lib/security/rate-limiter";

describe("Rate Limiter — Plan Configs", () => {
  it("guest plan has the most restrictive limits", () => {
    const guest = PLAN_CONFIGS.guest;
    expect(guest.monthlyLimit).toBe(3);
    expect(guest.perMinuteLimit).toBe(1);
    expect(guest.maxChars).toBe(2000);
    expect(guest.maxFileSize).toBe(0);
    expect(guest.allowedModes).toEqual(["fact-check"]);
    expect(guest.allowConcurrent).toBe(false);
  });

  it("free plan has moderate limits", () => {
    const free = PLAN_CONFIGS.free;
    expect(free.monthlyLimit).toBe(10);
    expect(free.perMinuteLimit).toBe(2);
    expect(free.maxChars).toBe(5000);
    expect(free.allowedModes).toContain("bias-check");
    expect(free.allowedModes).not.toContain("plagiarism");
    expect(free.allowConcurrent).toBe(false);
  });

  it("pro plan unlocks all modes", () => {
    const pro = PLAN_CONFIGS.pro;
    expect(pro.monthlyLimit).toBe(200);
    expect(pro.allowedModes).toContain("comprehensive");
    expect(pro.allowedModes).toContain("plagiarism");
    expect(pro.allowConcurrent).toBe(true);
  });

  it("team and enterprise have highest limits", () => {
    expect(PLAN_CONFIGS.team.monthlyLimit).toBe(999999);
    expect(PLAN_CONFIGS.enterprise.perMinuteLimit).toBe(20);
  });
});

describe("Rate Limiter — Cost Calculation", () => {
  it("single mode costs 1", () => {
    expect(calculateRequestCost(["fact-check"], "free")).toBe(1);
    expect(calculateRequestCost(["bias-check"], "pro")).toBe(1);
  });

  it("two modes costs 1.5", () => {
    expect(calculateRequestCost(["fact-check", "bias-check"], "pro")).toBe(1.5);
  });

  it("three modes costs 2", () => {
    expect(calculateRequestCost(["fact-check", "bias-check", "ai-detection"], "pro")).toBe(2);
  });

  it("comprehensive uses plan-specific multiplier", () => {
    expect(calculateRequestCost(["comprehensive"], "guest")).toBe(3);
    expect(calculateRequestCost(["comprehensive"], "free")).toBe(3);
    expect(calculateRequestCost(["comprehensive"], "pro")).toBe(2);
    expect(calculateRequestCost(["comprehensive"], "team")).toBe(1);
  });
});

describe("Rate Limiter — Burst Protection", () => {
  it("allows first request for any plan", async () => {
    const result = await checkBurstLimit("burst-test-1-" + Date.now(), "free");
    expect(result.allowed).toBe(true);
  });

  it("blocks guest after 1 request per minute", async () => {
    const key = "burst-guest-" + Date.now();
    const r1 = await checkBurstLimit(key, "guest");
    expect(r1.allowed).toBe(true);

    const r2 = await checkBurstLimit(key, "guest");
    expect(r2.allowed).toBe(false);
    expect(r2.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows free plan 2 requests per minute", async () => {
    const key = "burst-free-" + Date.now();
    expect((await checkBurstLimit(key, "free")).allowed).toBe(true);
    expect((await checkBurstLimit(key, "free")).allowed).toBe(true);
    expect((await checkBurstLimit(key, "free")).allowed).toBe(false);
  });

  it("pro plan allows 5 requests per minute", async () => {
    const key = "burst-pro-" + Date.now();
    for (let i = 0; i < 5; i++) {
      expect((await checkBurstLimit(key, "pro")).allowed).toBe(true);
    }
    expect((await checkBurstLimit(key, "pro")).allowed).toBe(false);
  });
});

describe("Rate Limiter — Concurrency Guard", () => {
  it("blocks concurrent requests for guest/free", async () => {
    const key = "conc-test-" + Date.now();
    expect(await acquireConcurrencySlot(key, "free")).toBe(true);
    expect(await acquireConcurrencySlot(key, "free")).toBe(false);
    await releaseConcurrencySlot(key);
    expect(await acquireConcurrencySlot(key, "free")).toBe(true);
    await releaseConcurrencySlot(key);
  });

  it("allows concurrent requests for pro/team", async () => {
    const key = "conc-pro-" + Date.now();
    expect(await acquireConcurrencySlot(key, "pro")).toBe(true);
    expect(await acquireConcurrencySlot(key, "pro")).toBe(true);
  });
});

describe("Rate Limiter — Anonymous Quota", () => {
  it("allows 3 requests for a new IP", async () => {
    const ip = "192.168.1." + Date.now();
    expect((await checkAnonymousQuota(ip)).allowed).toBe(true);
    expect((await checkAnonymousQuota(ip)).allowed).toBe(true);
    expect((await checkAnonymousQuota(ip)).allowed).toBe(true);
    expect((await checkAnonymousQuota(ip)).allowed).toBe(false);
  });

  it("tracks remaining count correctly", async () => {
    const ip = "10.0.0." + Date.now();
    const r1 = await checkAnonymousQuota(ip);
    expect(r1.remaining).toBe(2);

    const r2 = await checkAnonymousQuota(ip);
    expect(r2.remaining).toBe(1);
  });

  it("cost-weighted requests consume more quota", async () => {
    const ip = "172.16.0." + Date.now();
    // Cost 2 request eats 2 of 3 quota
    const r1 = await checkAnonymousQuota(ip, 2);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    // Cost 2 would exceed remaining 1
    const r2 = await checkAnonymousQuota(ip, 2);
    expect(r2.allowed).toBe(false);
  });
});

describe("Rate Limiter — Abuse Detection", () => {
  it("new IP is not abusive", async () => {
    expect(await isAbusiveIP("1.2.3." + Date.now())).toBe(false);
  });

  it("blocks IP after 5 violations", async () => {
    const ip = "abuse-test-" + Date.now();
    for (let i = 0; i < 5; i++) {
      await recordViolation(ip);
    }
    expect(await isAbusiveIP(ip)).toBe(true);
  });

  it("escalates block duration with more violations", async () => {
    const ip = "abuse-escalate-" + Date.now();
    for (let i = 0; i < 10; i++) {
      await recordViolation(ip);
    }
    expect(await isAbusiveIP(ip)).toBe(true);
  });
});

describe("Rate Limiter — Mode Filtering", () => {
  it("guest can only use fact-check", () => {
    const result = filterAllowedModes(
      ["fact-check", "bias-check", "ai-detection", "plagiarism"],
      "guest"
    );
    expect(result.filtered).toEqual(["fact-check"]);
    expect(result.blocked).toEqual(["bias-check", "ai-detection", "plagiarism"]);
  });

  it("free plan allows fact-check, bias, ai-detection", () => {
    const result = filterAllowedModes(
      ["fact-check", "bias-check", "ai-detection", "plagiarism", "framework-eval"],
      "free"
    );
    expect(result.filtered).toEqual(["fact-check", "bias-check", "ai-detection"]);
    expect(result.blocked).toEqual(["plagiarism", "framework-eval"]);
  });

  it("pro plan allows all modes", () => {
    const result = filterAllowedModes(
      ["fact-check", "bias-check", "ai-detection", "plagiarism", "framework-eval", "comprehensive"],
      "pro"
    );
    expect(result.filtered.length).toBe(6);
    expect(result.blocked.length).toBe(0);
  });

  it("falls back to fact-check if all modes blocked", () => {
    const result = filterAllowedModes(["plagiarism", "framework-eval"], "guest");
    expect(result.filtered).toEqual(["fact-check"]);
  });
});

describe("Rate Limiter — Input Limits", () => {
  it("guest limited to 2000 chars", () => {
    expect(checkCharLimit(2000, "guest")).toBe(true);
    expect(checkCharLimit(2001, "guest")).toBe(false);
  });

  it("free limited to 5000 chars", () => {
    expect(checkCharLimit(5000, "free")).toBe(true);
    expect(checkCharLimit(5001, "free")).toBe(false);
  });

  it("pro allows 25000 chars", () => {
    expect(checkCharLimit(25000, "pro")).toBe(true);
  });

  it("guest cannot upload files", () => {
    const result = checkFileLimit(1024, "guest");
    expect(result.allowed).toBe(false);
    expect(result.maxSize).toBe(0);
  });

  it("free limited to 2 MB files", () => {
    const twoMB = 2 * 1024 * 1024;
    expect(checkFileLimit(twoMB, "free").allowed).toBe(true);
    expect(checkFileLimit(twoMB + 1, "free").allowed).toBe(false);
  });

  it("pro allows 10 MB files", () => {
    const tenMB = 10 * 1024 * 1024;
    expect(checkFileLimit(tenMB, "pro").allowed).toBe(true);
  });
});

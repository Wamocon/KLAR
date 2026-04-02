import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  truncateText,
  getVerdictColor,
  getVerdictBg,
  calculateTrustScore,
} from "@/lib/utils";

describe("cn (class name merger)", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "active")).toBe("base active");
  });

  it("merges tailwind classes correctly (last wins)", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toContain("px-4");
    expect(result).not.toContain("px-2");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "extra")).toBe("base extra");
  });

  it("handles empty string", () => {
    expect(cn("")).toBe("");
  });

  it("handles object syntax", () => {
    expect(cn({ hidden: true, flex: false })).toBe("hidden");
  });

  it("handles array syntax", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});

describe("formatDate", () => {
  it("formats a date string in German locale", () => {
    const result = formatDate("2024-06-15T14:30:00Z", "de");
    expect(result).toContain("2024");
    expect(result).toMatch(/\d{2}:\d{2}/); // time portion
  });

  it("formats a date string in English locale", () => {
    const result = formatDate("2024-06-15T14:30:00Z", "en");
    expect(result).toContain("2024");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("defaults to German locale", () => {
    const de = formatDate("2024-06-15T14:30:00Z");
    const deExplicit = formatDate("2024-06-15T14:30:00Z", "de");
    expect(de).toBe(deExplicit);
  });

  it("accepts Date object", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const result = formatDate(date, "en");
    expect(result).toContain("2024");
  });

  it("includes month and day", () => {
    const result = formatDate("2024-03-14T10:00:00Z", "en");
    expect(result).toMatch(/Mar|14/);
  });
});

describe("truncateText", () => {
  it("returns short text unchanged", () => {
    expect(truncateText("Hello world", 200)).toBe("Hello world");
  });

  it("truncates text longer than maxLength", () => {
    const long = "A".repeat(300);
    const result = truncateText(long, 200);
    expect(result.length).toBeLessThanOrEqual(201); // 200 + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("defaults to 200 characters", () => {
    const long = "A".repeat(300);
    const result = truncateText(long);
    expect(result.length).toBeLessThanOrEqual(201);
  });

  it("returns exact length text unchanged", () => {
    const exact = "A".repeat(200);
    expect(truncateText(exact, 200)).toBe(exact);
  });

  it("handles empty string", () => {
    expect(truncateText("")).toBe("");
  });
});

describe("getVerdictColor", () => {
  it("returns green for supported", () => {
    expect(getVerdictColor("supported")).toContain("emerald");
  });

  it("returns red for contradicted", () => {
    expect(getVerdictColor("contradicted")).toContain("red");
  });

  it("returns amber for unverifiable", () => {
    expect(getVerdictColor("unverifiable")).toContain("amber");
  });

  it("returns gray for unknown verdict", () => {
    expect(getVerdictColor("unknown")).toContain("gray");
  });

  it("returns gray for empty string", () => {
    expect(getVerdictColor("")).toContain("gray");
  });
});

describe("getVerdictBg", () => {
  it("returns emerald background for supported", () => {
    expect(getVerdictBg("supported")).toContain("emerald");
  });

  it("returns red background for contradicted", () => {
    expect(getVerdictBg("contradicted")).toContain("red");
  });

  it("returns amber background for unverifiable", () => {
    expect(getVerdictBg("unverifiable")).toContain("amber");
  });

  it("returns gray background for unknown", () => {
    expect(getVerdictBg("something")).toContain("gray");
  });
});

describe("calculateTrustScore", () => {
  it("returns 0 for zero total claims", () => {
    expect(calculateTrustScore(0, 0)).toBe(0);
  });

  it("returns 100 for all supported", () => {
    expect(calculateTrustScore(10, 10)).toBe(100);
  });

  it("returns 0 for none supported", () => {
    expect(calculateTrustScore(0, 10)).toBe(0);
  });

  it("returns 50 for half supported", () => {
    expect(calculateTrustScore(5, 10)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(calculateTrustScore(1, 3)).toBe(33);
    expect(calculateTrustScore(2, 3)).toBe(67);
  });

  it("handles large numbers", () => {
    expect(calculateTrustScore(999, 1000)).toBe(100);
  });

  it("handles supported greater than total (invalid input)", () => {
    // Implementation does not clamp — returns >100
    expect(calculateTrustScore(15, 10)).toBe(150);
  });

  it("handles negative supported count", () => {
    expect(calculateTrustScore(-5, 10)).toBe(-50);
  });

  it("handles negative total (returns 0 via total===0 guard only when 0)", () => {
    // Negative total doesn't hit the guard, so it returns a value
    const result = calculateTrustScore(5, -10);
    expect(typeof result).toBe("number");
  });

  it("handles NaN inputs", () => {
    expect(calculateTrustScore(NaN, 10)).toBeNaN();
    expect(calculateTrustScore(5, NaN)).toBeNaN();
  });

  it("handles Infinity inputs", () => {
    expect(calculateTrustScore(Infinity, 10)).toBe(Infinity);
    expect(calculateTrustScore(5, Infinity)).toBe(0);
  });

  it("handles fractional inputs", () => {
    expect(calculateTrustScore(1.5, 3)).toBe(50);
    expect(calculateTrustScore(0.1, 1)).toBe(10);
  });
});

describe("cn — edge cases", () => {
  it("handles deeply nested arrays", () => {
    expect(cn([["foo", "bar"], "baz"])).toBe("foo bar baz");
  });

  it("handles special characters in class names", () => {
    expect(cn("w-[100px]", "h-[50%]")).toContain("w-[100px]");
    expect(cn("w-[100px]", "h-[50%]")).toContain("h-[50%]");
  });

  it("handles no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles all-falsy inputs", () => {
    expect(cn(false, null, undefined, 0, "")).toBe("");
  });

  it("handles numeric input (truthy non-string)", () => {
    // clsx coerces numbers to strings
    expect(cn(42 as unknown as string)).toBe("42");
  });
});

describe("formatDate — edge cases", () => {
  it("handles epoch timestamp", () => {
    const result = formatDate("1970-01-01T00:00:00Z", "en");
    expect(result).toContain("1970");
  });

  it("handles far future date", () => {
    const result = formatDate("2099-06-15T12:00:00Z", "en");
    expect(result).toContain("2099");
  });

  it("throws for completely invalid date string", () => {
    expect(() => formatDate("not-a-date")).toThrow();
  });

  it("handles ISO date without time", () => {
    const result = formatDate("2024-06-15", "en");
    expect(result).toContain("2024");
  });

  it("handles unsupported locale gracefully", () => {
    // Non de/en locale falls to en-US path
    const result = formatDate("2024-06-15T14:30:00Z", "fr");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("truncateText — edge cases", () => {
  it("handles Unicode emoji correctly", () => {
    const emoji = "👍".repeat(250);
    const result = truncateText(emoji, 200);
    expect(result.endsWith("…")).toBe(true);
  });

  it("handles maxLength of 0", () => {
    const result = truncateText("Hello", 0);
    expect(result).toBe("…");
  });

  it("handles maxLength of 1", () => {
    const result = truncateText("Hello", 1);
    expect(result.length).toBeLessThanOrEqual(2); // 1 char + ellipsis
  });

  it("handles single character string", () => {
    expect(truncateText("A", 200)).toBe("A");
  });

  it("handles string with only whitespace", () => {
    expect(truncateText("   ", 200)).toBe("   ");
  });

  it("handles multi-byte characters (CJK)", () => {
    const cjk = "日本語テスト".repeat(50);
    const result = truncateText(cjk, 200);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("getVerdictColor — edge cases", () => {
  it("returns default for null-ish coerced to string", () => {
    expect(getVerdictColor(undefined as unknown as string)).toContain("gray");
    expect(getVerdictColor(null as unknown as string)).toContain("gray");
  });

  it("returns default for case-mismatched verdicts (case-sensitive)", () => {
    expect(getVerdictColor("Supported")).toContain("gray");
    expect(getVerdictColor("CONTRADICTED")).toContain("gray");
  });

  it("returns default for whitespace-padded verdict", () => {
    expect(getVerdictColor(" supported ")).toContain("gray");
  });
});

describe("getVerdictBg — edge cases", () => {
  it("returns default for empty-ish inputs", () => {
    expect(getVerdictBg("")).toContain("gray");
    expect(getVerdictBg(undefined as unknown as string)).toContain("gray");
  });

  it("returns default for typo in verdict", () => {
    expect(getVerdictBg("suported")).toContain("gray");
    expect(getVerdictBg("contrdicted")).toContain("gray");
  });
});

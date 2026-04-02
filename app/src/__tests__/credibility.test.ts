import { describe, it, expect } from "vitest";
import { getSourceCredibility, extractDomain, getAverageSourceCredibility } from "@/lib/evidence/credibility";

describe("extractDomain", () => {
  it("extracts domain from standard URL", () => {
    expect(extractDomain("https://en.wikipedia.org/wiki/Berlin")).toBe("en.wikipedia.org");
  });

  it("removes www prefix", () => {
    expect(extractDomain("https://www.reuters.com/article/test")).toBe("reuters.com");
  });

  it("returns empty string for invalid URL", () => {
    expect(extractDomain("not-a-url")).toBe("");
  });
});

describe("getSourceCredibility", () => {
  it("rates Wikipedia highly", () => {
    const result = getSourceCredibility("https://en.wikipedia.org/wiki/Berlin");
    expect(result.category).toBe("wiki");
    expect(result.score).toBeGreaterThanOrEqual(0.8);
  });

  it("rates Nature as academic", () => {
    const result = getSourceCredibility("https://www.nature.com/articles/test");
    expect(result.category).toBe("academic");
    expect(result.score).toBeGreaterThanOrEqual(0.9);
  });

  it("rates social media low", () => {
    const result = getSourceCredibility("https://twitter.com/user/status/123");
    expect(result.category).toBe("social_media");
    expect(result.score).toBeLessThan(0.5);
  });

  it("rates .gov domains as government", () => {
    const result = getSourceCredibility("https://www.example.gov/data");
    expect(result.category).toBe("government");
    expect(result.score).toBeGreaterThanOrEqual(0.8);
  });

  it("rates .edu domains as academic", () => {
    const result = getSourceCredibility("https://www.stanford.edu/research");
    expect(result.category).toBe("academic");
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  it("returns unknown for unrecognized domains", () => {
    const result = getSourceCredibility("https://randomsite.com/page");
    expect(result.category).toBe("unknown");
    expect(result.score).toBe(0.5);
  });

  it("rates Reuters as major news", () => {
    const result = getSourceCredibility("https://www.reuters.com/world/test");
    expect(result.category).toBe("news_major");
    expect(result.score).toBeGreaterThanOrEqual(0.85);
  });
});

describe("getAverageSourceCredibility", () => {
  it("returns 0 for empty sources", () => {
    expect(getAverageSourceCredibility([])).toBe(0);
  });

  it("computes average credibility", () => {
    const sources = [
      { title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Test", snippet: "Test", source_type: "wikipedia" as const },
      { title: "Random Blog", url: "https://blog.random.com/post", snippet: "Test", source_type: "web" as const },
    ];
    const avg = getAverageSourceCredibility(sources);
    expect(avg).toBeGreaterThan(0.5);
    expect(avg).toBeLessThan(0.9);
  });
});

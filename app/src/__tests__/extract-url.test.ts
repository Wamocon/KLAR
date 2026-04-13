import { describe, it, expect, vi, beforeEach } from "vitest";
import { isBlockedHostname } from "@/lib/utils/extract-url";

// ── SSRF Protection (isBlockedHostname) ──

describe("isBlockedHostname", () => {
  it("blocks localhost", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("LOCALHOST")).toBe(true);
  });

  it("blocks 127.x.x.x loopback addresses", () => {
    expect(isBlockedHostname("127.0.0.1")).toBe(true);
    expect(isBlockedHostname("127.255.255.255")).toBe(true);
  });

  it("blocks 10.x.x.x private addresses", () => {
    expect(isBlockedHostname("10.0.0.1")).toBe(true);
    expect(isBlockedHostname("10.255.255.255")).toBe(true);
  });

  it("blocks 172.16-31.x.x private addresses", () => {
    expect(isBlockedHostname("172.16.0.1")).toBe(true);
    expect(isBlockedHostname("172.31.255.255")).toBe(true);
  });

  it("blocks 192.168.x.x private addresses", () => {
    expect(isBlockedHostname("192.168.0.1")).toBe(true);
    expect(isBlockedHostname("192.168.255.255")).toBe(true);
  });

  it("blocks AWS/cloud metadata endpoint 169.254.x.x", () => {
    expect(isBlockedHostname("169.254.169.254")).toBe(true);
    expect(isBlockedHostname("169.254.0.1")).toBe(true);
  });

  it("blocks 0.x.x.x addresses", () => {
    expect(isBlockedHostname("0.0.0.0")).toBe(true);
  });

  it("blocks IPv6 loopback", () => {
    expect(isBlockedHostname("[::1]")).toBe(true);
  });

  it("blocks IPv6 private ranges", () => {
    expect(isBlockedHostname("[fc00::1]")).toBe(true);
    expect(isBlockedHostname("[fd00::1]")).toBe(true);
    expect(isBlockedHostname("[fe80::1]")).toBe(true);
  });

  it("blocks .local, .internal, .corp, .home domains", () => {
    expect(isBlockedHostname("myapp.local")).toBe(true);
    expect(isBlockedHostname("server.internal")).toBe(true);
    expect(isBlockedHostname("intranet.corp")).toBe(true);
    expect(isBlockedHostname("router.home")).toBe(true);
  });

  it("allows legitimate public domains", () => {
    expect(isBlockedHostname("www.bbc.com")).toBe(false);
    expect(isBlockedHostname("news.ycombinator.com")).toBe(false);
    expect(isBlockedHostname("example.com")).toBe(false);
    expect(isBlockedHostname("8.8.8.8")).toBe(false);
  });

  it("allows external IPs that look similar to private ranges", () => {
    expect(isBlockedHostname("172.32.0.1")).toBe(false);
    expect(isBlockedHostname("11.0.0.1")).toBe(false);
    expect(isBlockedHostname("192.169.0.1")).toBe(false);
  });
});

// ── URL Content Extraction ──

describe("extractUrlContent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-HTTP URLs", async () => {
    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    await expect(extractUrlContent("ftp://files.example.com/doc.txt")).rejects.toThrow();
  });

  it("rejects invalid URLs", async () => {
    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    await expect(extractUrlContent("not-a-url")).rejects.toThrow("Invalid URL");
  });

  it("rejects SSRF targets", async () => {
    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    await expect(extractUrlContent("http://localhost:3000/admin")).rejects.toThrow("restricted network address");
    await expect(extractUrlContent("http://169.254.169.254/latest/meta-data")).rejects.toThrow("restricted network address");
    await expect(extractUrlContent("http://10.0.0.1/internal")).rejects.toThrow("restricted network address");
  });

  it("extracts content from valid HTML with article text", async () => {
    const mockHtml = `
      <html>
        <head><title>Test Article</title></head>
        <body>
          <article>
            <h1>Test Article Title</h1>
            <p>This is a sufficiently long article body text that contains more than one hundred characters of content for the Readability algorithm to extract properly. It discusses climate change and its effects on global temperatures, sea levels, and arctic ice caps. Scientists have confirmed that this is happening at an unprecedented rate.</p>
          </article>
        </body>
      </html>
    `;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(mockHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    );

    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    const result = await extractUrlContent("https://example.com/article");

    expect(result.url).toBe("https://example.com/article");
    expect(result.content.length).toBeGreaterThan(100);
    expect(result.wordCount).toBeGreaterThan(10);
  });

  it("rejects non-HTML content types", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("binary data", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      })
    );

    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    await expect(extractUrlContent("https://example.com/doc.pdf")).rejects.toThrow("HTML page");
  });

  it("handles HTTP error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    await expect(extractUrlContent("https://example.com/missing")).rejects.toThrow("HTTP 404");
  });

  it("extracts from JSON-LD when Readability fails", async () => {
    const mockHtml = `
      <html>
        <head>
          <title>JSON-LD Page</title>
          <script type="application/ld+json">
            {"@type": "Article", "articleBody": "This is the article body extracted from JSON-LD structured data. It contains more than one hundred characters of useful content about recent scientific discoveries and technological breakthroughs in the field of renewable energy."}
          </script>
        </head>
        <body><div>Minimal body</div></body>
      </html>
    `;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(mockHtml, {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );

    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    const result = await extractUrlContent("https://example.com/jsonld");
    expect(result.content).toContain("article body extracted from JSON-LD");
  });

  it("extracts from meta tags as fallback", async () => {
    const longDesc = "A".repeat(150);
    const mockHtml = `
      <html>
        <head>
          <title>Meta Page</title>
          <meta property="og:description" content="${longDesc}" />
        </head>
        <body><nav>Nav only</nav></body>
      </html>
    `;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(mockHtml, {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );

    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    const result = await extractUrlContent("https://example.com/meta-only");
    expect(result.content.length).toBeGreaterThan(50);
  });

  it("truncates content to 50000 characters", async () => {
    const longContent = "A".repeat(60000);
    const mockHtml = `
      <html><head><title>Long</title></head>
      <body><article><p>${longContent}</p></article></body>
      </html>
    `;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(mockHtml, {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );

    const { extractUrlContent } = await import("@/lib/utils/extract-url");
    const result = await extractUrlContent("https://example.com/long");
    expect(result.content.length).toBeLessThanOrEqual(50000);
  });
});

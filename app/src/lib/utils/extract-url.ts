import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface ExtractedPage {
  title: string;
  content: string;
  url: string;
  siteName: string | null;
  excerpt: string | null;
  wordCount: number;
}

/**
 * Check if a hostname resolves to a private/internal IP range (SSRF protection).
 */
export function isBlockedHostname(hostname: string): boolean {
  const blocked = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^\[::1\]$/,
    /^\[fc/i,
    /^\[fd/i,
    /^\[fe80:/i,
    /\.local$/i,
    /\.internal$/i,
    /\.corp$/i,
    /\.home$/i,
  ];
  return blocked.some((re) => re.test(hostname));
}

/**
 * Fetches a URL and extracts the main article text using Mozilla Readability.
 * Falls back to raw text extraction if Readability fails.
 */
export async function extractUrlContent(url: string): Promise<ExtractedPage> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported");
    }
  } catch {
    throw new Error("Invalid URL. Please enter a valid web address.");
  }

  // SSRF protection: block private/internal hostnames
  if (isBlockedHostname(parsedUrl.hostname)) {
    throw new Error("This URL points to a restricted network address and cannot be accessed.");
  }

  // Fetch with timeout — use a realistic browser User-Agent to avoid bot blocks
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (HTTP ${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("URL must point to an HTML page. PDFs and other formats are not yet supported.");
  }

  const html = await response.text();

  // Parse with JSDOM + Readability
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document.cloneNode(true) as Document);
  const article = reader.parse();

  if (article && article.textContent && article.textContent.trim().length > 100) {
    const cleanText = cleanExtractedText(article.textContent);
    return {
      title: article.title || parsedUrl.hostname,
      content: cleanText.slice(0, 50000),
      url,
      siteName: article.siteName || parsedUrl.hostname,
      excerpt: article.excerpt || null,
      wordCount: cleanText.split(/\s+/).length,
    };
  }

  // Fallback 1: Extract from JSON-LD structured data (works for JS-heavy sites)
  const jsonLdText = extractFromJsonLd(dom);
  if (jsonLdText && jsonLdText.length > 100) {
    const cleanText = cleanExtractedText(jsonLdText);
    return {
      title: dom.window.document.title || parsedUrl.hostname,
      content: cleanText.slice(0, 50000),
      url,
      siteName: parsedUrl.hostname,
      excerpt: null,
      wordCount: cleanText.split(/\s+/).length,
    };
  }

  // Fallback 2: Extract from meta tags (og:description, description)
  const metaText = extractFromMeta(dom);

  // Fallback 3: extract text from body
  const fallbackText = extractFallbackText(dom);
  const combinedFallback = [metaText, fallbackText].filter(Boolean).join("\n\n");

  // Fallback 4: If all DOM-based approaches fail, try Serper's scrape API
  if (combinedFallback.length < 50) {
    const scraped = await scrapeViaSerper(url);
    if (scraped && scraped.length > 50) {
      return {
        title: dom.window.document.title || parsedUrl.hostname,
        content: scraped.slice(0, 50000),
        url,
        siteName: parsedUrl.hostname,
        excerpt: null,
        wordCount: scraped.split(/\s+/).length,
      };
    }
    throw new Error("Could not extract meaningful content from this URL. The page may be behind a login wall or use heavy JavaScript rendering.");
  }

  return {
    title: dom.window.document.title || parsedUrl.hostname,
    content: combinedFallback.slice(0, 50000),
    url,
    siteName: parsedUrl.hostname,
    excerpt: null,
    wordCount: combinedFallback.split(/\s+/).length,
  };
}

function extractFromJsonLd(dom: JSDOM): string | null {
  const scripts = dom.window.document.querySelectorAll('script[type="application/ld+json"]');
  const texts: string[] = [];

  scripts.forEach((script) => {
    try {
      const data = JSON.parse(script.textContent || "");
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.articleBody) texts.push(item.articleBody);
        else if (item.description) texts.push(item.description);
        else if (item.text) texts.push(item.text);
        // Handle @graph arrays (common in blogs)
        if (Array.isArray(item["@graph"])) {
          for (const node of item["@graph"]) {
            if (node.articleBody) texts.push(node.articleBody);
            else if (node.description) texts.push(node.description);
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return texts.length > 0 ? texts.join("\n\n") : null;
}

function extractFromMeta(dom: JSDOM): string {
  const doc = dom.window.document;
  const parts: string[] = [];

  // og:description, twitter:description, description
  const metaSelectors = [
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
    'meta[property="og:title"]',
  ];

  for (const sel of metaSelectors) {
    const el = doc.querySelector(sel);
    const content = el?.getAttribute("content");
    if (content && content.length > 20) {
      parts.push(content);
    }
  }

  return parts.join("\n\n");
}

/**
 * Use Serper's scrape endpoint as a last resort for JS-rendered pages.
 * Falls back to a search query about the URL to get snippets.
 */
async function scrapeViaSerper(url: string): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  try {
    // Try Serper's webpage scrape endpoint
    const scrapeRes = await fetch("https://scrape.serper.dev", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(10000),
    });

    if (scrapeRes.ok) {
      const data = await scrapeRes.json();
      if (data?.text && data.text.length > 50) {
        return cleanExtractedText(data.text);
      }
    }
  } catch {
    // Scrape endpoint failed, try search fallback
  }

  try {
    // Search fallback: search for the exact URL to get Google's cached snippets
    const searchRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: url, num: 5 }),
      signal: AbortSignal.timeout(8000),
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      const organic = data?.organic || [];
      const snippets = organic
        .map((r: { snippet?: string; title?: string }) =>
          [r.title, r.snippet].filter(Boolean).join(": ")
        )
        .filter(Boolean);
      if (snippets.length > 0) {
        return snippets.join("\n\n");
      }
    }
  } catch {
    // Search also failed
  }

  return null;
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")     // Collapse triple+ newlines
    .replace(/[ \t]+/g, " ")         // Collapse spaces
    .replace(/^\s+$/gm, "")          // Remove blank lines
    .trim();
}

function extractFallbackText(dom: JSDOM): string {
  const doc = dom.window.document;
  
  // Remove scripts, styles, nav, footer, header
  const removeSelectors = "script, style, nav, footer, header, aside, [role='navigation'], [role='banner']";
  doc.querySelectorAll(removeSelectors).forEach((el) => el.remove());

  // Try main content areas first
  const mainEl =
    doc.querySelector("main") ||
    doc.querySelector("article") ||
    doc.querySelector('[role="main"]') ||
    doc.body;

  const text = mainEl?.textContent || "";
  return cleanExtractedText(text);
}

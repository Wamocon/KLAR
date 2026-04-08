import type { SourceCategory, ClaimSource } from "@/types";

const KNOWN_DOMAINS: Record<string, { category: SourceCategory; baseScore: number }> = {
  // ── Academic & Research ──
  "wikipedia.org": { category: "wiki", baseScore: 0.85 },
  "wikidata.org": { category: "wiki", baseScore: 0.9 },
  "nature.com": { category: "academic", baseScore: 0.95 },
  "science.org": { category: "academic", baseScore: 0.95 },
  "sciencedirect.com": { category: "academic", baseScore: 0.9 },
  "pubmed.ncbi.nlm.nih.gov": { category: "academic", baseScore: 0.92 },
  "arxiv.org": { category: "academic", baseScore: 0.8 },
  "scholar.google.com": { category: "academic", baseScore: 0.85 },
  "jstor.org": { category: "academic", baseScore: 0.9 },
  "springer.com": { category: "academic", baseScore: 0.88 },
  "wiley.com": { category: "academic", baseScore: 0.88 },
  "researchgate.net": { category: "academic", baseScore: 0.75 },
  "semanticscholar.org": { category: "academic", baseScore: 0.82 },
  // ── Major News (International) ──
  "reuters.com": { category: "news_major", baseScore: 0.88 },
  "apnews.com": { category: "news_major", baseScore: 0.88 },
  "bbc.com": { category: "news_major", baseScore: 0.85 },
  "bbc.co.uk": { category: "news_major", baseScore: 0.85 },
  "nytimes.com": { category: "news_major", baseScore: 0.82 },
  "theguardian.com": { category: "news_major", baseScore: 0.8 },
  "washingtonpost.com": { category: "news_major", baseScore: 0.8 },
  "economist.com": { category: "news_major", baseScore: 0.85 },
  "ft.com": { category: "news_major", baseScore: 0.85 },
  "bloomberg.com": { category: "news_major", baseScore: 0.83 },
  // ── German News & Media ──
  "spiegel.de": { category: "news_major", baseScore: 0.82 },
  "zeit.de": { category: "news_major", baseScore: 0.82 },
  "sueddeutsche.de": { category: "news_major", baseScore: 0.82 },
  "faz.net": { category: "news_major", baseScore: 0.82 },
  "tagesschau.de": { category: "news_major", baseScore: 0.88 },
  "zdf.de": { category: "news_major", baseScore: 0.85 },
  "deutschlandfunk.de": { category: "news_major", baseScore: 0.85 },
  "handelsblatt.com": { category: "news_major", baseScore: 0.82 },
  "welt.de": { category: "news_major", baseScore: 0.78 },
  "stern.de": { category: "news_major", baseScore: 0.72 },
  "focus.de": { category: "news_major", baseScore: 0.7 },
  "bild.de": { category: "news_local", baseScore: 0.45 }, // Tabloid
  "t-online.de": { category: "news_local", baseScore: 0.6 },
  // ── Fact-Checking Organizations ──
  "snopes.com": { category: "news_major", baseScore: 0.9 },
  "factcheck.org": { category: "news_major", baseScore: 0.92 },
  "politifact.com": { category: "news_major", baseScore: 0.9 },
  "correctiv.org": { category: "news_major", baseScore: 0.9 }, // German fact-check
  "faktencheck.afp.com": { category: "news_major", baseScore: 0.9 },
  // ── Government & International Organizations ──
  "gov.uk": { category: "government", baseScore: 0.9 },
  "europa.eu": { category: "government", baseScore: 0.9 },
  "who.int": { category: "government", baseScore: 0.92 },
  "un.org": { category: "government", baseScore: 0.9 },
  "cdc.gov": { category: "government", baseScore: 0.92 },
  "nih.gov": { category: "government", baseScore: 0.92 },
  "destatis.de": { category: "government", baseScore: 0.9 },
  "bundesregierung.de": { category: "government", baseScore: 0.9 },
  "bundestag.de": { category: "government", baseScore: 0.9 },
  "bpb.de": { category: "government", baseScore: 0.88 },
  "ec.europa.eu": { category: "government", baseScore: 0.9 },
  "worldbank.org": { category: "government", baseScore: 0.88 },
  "imf.org": { category: "government", baseScore: 0.88 },
  "oecd.org": { category: "government", baseScore: 0.88 },
  "statista.com": { category: "corporate", baseScore: 0.75 },
  // ── Social Media (low credibility) ──
  "twitter.com": { category: "social_media", baseScore: 0.3 },
  "x.com": { category: "social_media", baseScore: 0.3 },
  "reddit.com": { category: "social_media", baseScore: 0.25 },
  "facebook.com": { category: "social_media", baseScore: 0.2 },
  "instagram.com": { category: "social_media", baseScore: 0.2 },
  "tiktok.com": { category: "social_media", baseScore: 0.15 },
  "youtube.com": { category: "social_media", baseScore: 0.35 },
  // ── Blogs (medium-low credibility) ──
  "medium.com": { category: "blog", baseScore: 0.45 },
  "substack.com": { category: "blog", baseScore: 0.45 },
  "wordpress.com": { category: "blog", baseScore: 0.35 },
  "blogspot.com": { category: "blog", baseScore: 0.35 },
};

export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove "www." prefix
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getSourceCredibility(url: string): {
  domain: string;
  category: SourceCategory;
  score: number;
} {
  const domain = extractDomain(url);
  if (!domain) {
    return { domain: "", category: "unknown", score: 0.5 };
  }

  // Check exact match first
  if (KNOWN_DOMAINS[domain]) {
    return {
      domain,
      category: KNOWN_DOMAINS[domain].category,
      score: KNOWN_DOMAINS[domain].baseScore,
    };
  }

  // Check parent domain (e.g. "en.wikipedia.org" → "wikipedia.org")
  const parts = domain.split(".");
  if (parts.length > 2) {
    const parentDomain = parts.slice(-2).join(".");
    if (KNOWN_DOMAINS[parentDomain]) {
      return {
        domain,
        category: KNOWN_DOMAINS[parentDomain].category,
        score: KNOWN_DOMAINS[parentDomain].baseScore,
      };
    }
  }

  // Heuristic-based categorization
  if (domain.endsWith(".edu") || domain.endsWith(".ac.uk")) {
    return { domain, category: "academic", score: 0.8 };
  }
  if (domain.endsWith(".gov") || domain.endsWith(".gov.uk") || domain.endsWith(".gob")) {
    return { domain, category: "government", score: 0.85 };
  }
  if (domain.endsWith(".org")) {
    return { domain, category: "unknown", score: 0.6 };
  }

  return { domain, category: "unknown", score: 0.5 };
}

export function enrichSourcesWithCredibility(sources: ClaimSource[]): Array<
  ClaimSource & { credibility: { domain: string; category: SourceCategory; score: number } }
> {
  return sources.map((source) => ({
    ...source,
    credibility: getSourceCredibility(source.url),
  }));
}

export function getAverageSourceCredibility(sources: ClaimSource[]): number {
  if (sources.length === 0) return 0;
  const total = sources.reduce((sum, s) => sum + getSourceCredibility(s.url).score, 0);
  return Math.round((total / sources.length) * 100) / 100;
}

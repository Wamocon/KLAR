import type { ClaimSource } from "@/types";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_DE_API = "https://de.wikipedia.org/w/api.php";

interface WikiSearchResult {
  title: string;
  snippet: string;
  pageid: number;
}

export async function searchWikipedia(
  query: string,
  lang: string = "en"
): Promise<ClaimSource[]> {
  const apiUrl = lang === "de" ? WIKIPEDIA_DE_API : WIKIPEDIA_API;
  const domain = lang === "de" ? "de.wikipedia.org" : "en.wikipedia.org";

  try {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srnamespace: "0",
      srlimit: "3",
      srprop: "snippet",
      format: "json",
      origin: "*",
    });

    const response = await fetch(`${apiUrl}?${params}`, {
      headers: { "User-Agent": "KLAR/1.0 (verification-platform)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const results: WikiSearchResult[] = data?.query?.search || [];

    return results.map((r) => ({
      title: r.title,
      url: `https://${domain}/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      snippet: stripHtml(r.snippet),
      source_type: "wikipedia" as const,
    }));
  } catch {
    return [];
  }
}

export async function searchWikidata(query: string): Promise<ClaimSource[]> {
  try {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      search: query,
      language: "en",
      limit: "2",
      format: "json",
      origin: "*",
    });

    const response = await fetch(
      `https://www.wikidata.org/w/api.php?${params}`,
      {
        headers: { "User-Agent": "KLAR/1.0 (verification-platform)" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const results = data?.search || [];

    return results.map(
      (r: { label: string; id: string; description?: string }) => ({
        title: r.label,
        url: `https://www.wikidata.org/wiki/${r.id}`,
        snippet: r.description || "",
        source_type: "wikidata" as const,
      })
    );
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .trim();
}

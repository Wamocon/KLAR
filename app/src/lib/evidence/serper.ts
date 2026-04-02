import type { ClaimSource } from "@/types";

const SERPER_API_URL = "https://google.serper.dev/search";

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

export async function searchWeb(query: string): Promise<ClaimSource[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn("SERPER_API_KEY not configured, skipping web search");
    return [];
  }

  try {
    const response = await fetch(SERPER_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 3,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const results: SerperResult[] = data?.organic || [];

    return results.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet || "",
      source_type: "web" as const,
    }));
  } catch {
    return [];
  }
}

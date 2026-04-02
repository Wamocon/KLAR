import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://klar.ai";

  const staticPages = [
    "",
    "/verify",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/imprint",
    "/auth/login",
    "/auth/signup",
  ];

  const locales = ["en", "de"];

  return locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? ("weekly" as const) : ("monthly" as const),
      priority: page === "" ? 1.0 : page === "/verify" ? 0.9 : 0.6,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${baseUrl}/${l}${page}`])
        ),
      },
    }))
  );
}

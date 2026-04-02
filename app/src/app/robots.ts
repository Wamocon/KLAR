import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://klar.ai";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/history", "/settings", "/report/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "KLAR — Knowledge Legitimacy Audit & Review",
  description:
    "AI-powered verification of AI-generated content. Check every claim against real sources.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  manifest: "/manifest.json",
  openGraph: {
    title: "KLAR — Knowledge Legitimacy Audit & Review",
    description:
      "AI-powered verification of AI-generated content. Check every claim against real sources.",
    type: "website",
    siteName: "KLAR",
    locale: "en",
    alternateLocale: "de",
  },
  twitter: {
    card: "summary",
    title: "KLAR — Knowledge Legitimacy Audit & Review",
    description: "AI-powered verification of AI-generated content. Check every claim against real sources.",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50">
        {children}
      </body>
    </html>
  );
}
